import { createClient } from '@/lib/supabase-server'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

export const maxDuration = 60; // Aumentei para 60s pois gerar 9 dicas pode demorar um pouquinho mais

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return new Response('Unauthorized', { status: 401 })

    // --- 1. PARÂMETROS ---
    const body = await req.json().catch(() => ({}))
    const today = new Date()
    
    const selectedMonth = body.month !== undefined ? Number(body.month) : today.getMonth()
    const selectedYear = body.year !== undefined ? Number(body.year) : today.getFullYear()

    // --- 2. VERIFICAÇÃO DE CACHE ---
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: cachedData } = await supabase
      .from('ai_insights_cache')
      .select('insights')
      .eq('user_id', user.id)
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cachedData?.insights) {
      return new Response(JSON.stringify({ insights: cachedData.insights }), {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      })
    }

    // --- 3. PREPARAÇÃO DE DATAS ---
    const getISODate = (year: number, month: number, day: number, time: string) => {
        const date = new Date(Date.UTC(year, month, day))
        return `${date.toISOString().split('T')[0]}T${time}Z`
    }

    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const startCurrent = getISODate(selectedYear, selectedMonth, 1, '00:00:00.000')
    const endCurrent = getISODate(selectedYear, selectedMonth, lastDay, '23:59:59.999')

    const prevDate = new Date(selectedYear, selectedMonth - 1, 1)
    const lastDayPrev = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate()
    const startPrev = getISODate(prevDate.getFullYear(), prevDate.getMonth(), 1, '00:00:00.000')
    const endPrev = getISODate(prevDate.getFullYear(), prevDate.getMonth(), lastDayPrev, '23:59:59.999')

    // --- 4. BUSCA DE DADOS ---
    const expensesQuery = await supabase
        .from('expenses')
        .select('*') 
        .eq('user_id', user.id)
        .gte('date', startCurrent)
        .lte('date', endCurrent)

    if (expensesQuery.error) console.error("Erro Expenses:", expensesQuery.error)

    const [incomes, prevExpenses, userData] = await Promise.all([
        supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startCurrent).lte('date', endCurrent),
        supabase.from('expenses').select('value').eq('user_id', user.id).gte('date', startPrev).lte('date', endPrev),
        supabase.from('users').select('full_name').eq('id', user.id).single()
    ])

    const expensesData = expensesQuery.data || []
    
    // Top Cartão
    let cardTransactions: any[] = []
    const creditExpenseIds = expensesData
        .filter((e: any) => e.is_credit_card === true)
        .map((e: any) => e.id)
    
    if (creditExpenseIds.length > 0) {
        const { data: ct } = await supabase
            .from('card_transactions')
            .select('description, amount, category')
            .in('expense_id', creditExpenseIds)
            .order('amount', { ascending: false })
            .limit(10)
        cardTransactions = ct || []
    }

    // Totais e Variação
    const totalExp = expensesData.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0)
    const totalInc = incomes.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0
    const balance = totalInc - totalExp
    const prevTotalExp = prevExpenses.data?.reduce((acc, curr) => acc + curr.value, 0) || 0

    let variationText = "Estável"
    if (prevTotalExp > 0) {
        const diff = ((totalExp - prevTotalExp) / prevTotalExp) * 100
        variationText = diff > 0 ? `+${diff.toFixed(0)}%` : `-${Math.abs(diff).toFixed(0)}%`
    }

    // --- 5. GERAÇÃO COM IA (AGORA COM 9 INSIGHTS) ---
    const prompt = `
      Atue como 'Bleu IA', consultor financeiro pessoal.
      Cliente: ${userData.data?.full_name || 'Usuário'}.
      Mês Analisado: ${selectedMonth + 1}/${selectedYear}.
      
      DADOS DO CLIENTE:
      - Total Despesas: R$ ${totalExp.toFixed(2)} (${variationText} vs mês anterior)
      - Total Receitas: R$ ${totalInc.toFixed(2)}
      - Saldo: R$ ${balance.toFixed(2)}
      
      TOP GASTOS GERAIS:
      ${JSON.stringify(expensesData.filter((e: any) => !e.is_credit_card).sort((a: any, b: any) => b.value - a.value).slice(0,5))}
      
      TOP FATURA CARTÃO:
      ${JSON.stringify(cardTransactions)}

      MISSÃO:
      Gere exatamente 9 insights curtos (máximo 15 palavras cada).
      Divida-os mentalmente em 3 grupos para dar variedade ao carrossel:

      - GRUPO A (Alertas): 3 insights focados em variações bruscas, saldo negativo ou gastos altos.
      - GRUPO B (Ação Prática): 3 insights focados em onde cortar (iFood, Uber, Mercado) citando nomes.
      - GRUPO C (Educação/Elogio): 3 insights com dicas de investimento (CDB/Tesouro) ou parabéns pelo controle.

      IMPORTANTE:
      - Se a Despesa for R$ 0,00, questione se esqueceu de lançar.
      - Seja direto, sem introduções.
    `

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'), 
      schema: z.object({
        insights: z.array(z.string()).length(9) // Obrigamos a IA a mandar 9 itens
      }),
      prompt: prompt,
      temperature: 0.7,
    })

    // --- 6. SALVAR NO CACHE ---
    try {
        await supabase.from('ai_insights_cache')
            .delete()
            .eq('user_id', user.id)
            .eq('month', selectedMonth)
            .eq('year', selectedYear)

        await supabase.from('ai_insights_cache').insert({
          user_id: user.id,
          insights: object.insights,
          month: selectedMonth,
          year: selectedYear
        })
    } catch (err) {
        console.error("Erro ao salvar cache:", err)
    }

    return new Response(JSON.stringify({ insights: object.insights }), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    })

  } catch (error: any) {
    console.error("Erro API Route:", error)
    return new Response(JSON.stringify({ 
        insights: ["Erro na análise.", "Tente recarregar."] 
    }), { status: 200 })
  }
}