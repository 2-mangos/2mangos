import { createClient } from '@/lib/supabase-server'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return new Response('Unauthorized', { status: 401 })

    // --- 1. Verificação de Cache ---
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: cachedData } = await supabase
      .from('ai_insights_cache')
      .select('insights')
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cachedData?.insights) {
      return new Response(JSON.stringify({ insights: cachedData.insights }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // --- 2. Busca de Dados ---
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

    const [expenses, incomes, userData] = await Promise.all([
        supabase.from('expenses').select('id, name, value, is_credit_card').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('users').select('full_name').eq('id', user.id).single()
    ])

    let cardTransactions: any[] = []
    const creditExpenseIds = expenses.data?.filter(e => e.is_credit_card).map(e => e.id) || []
    
    if (creditExpenseIds.length > 0) {
        const { data: ct } = await supabase
            .from('card_transactions')
            .select('description, amount, category')
            .in('expense_id', creditExpenseIds)
            .order('amount', { ascending: false })
            .limit(15)
        cardTransactions = ct || []
    }

    const totalExpenses = expenses.data?.reduce((acc, curr) => acc + curr.value, 0) || 0
    const totalIncome = incomes.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0
    const balance = totalIncome - totalExpenses

    // --- 3. Prompt ---
    const prompt = `
      Atue como 'Bleu IA', consultor financeiro.
      Cliente: ${userData.data?.full_name || 'Usuário'}.
      
      DADOS DO MÊS:
      Receitas: R$ ${totalIncome.toFixed(2)}
      Despesas: R$ ${totalExpenses.toFixed(2)}
      Saldo: R$ ${balance.toFixed(2)}
      
      DETALHES:
      Gastos Gerais: ${JSON.stringify(expenses.data?.filter(e => !e.is_credit_card).slice(0,5))}
      Fatura Cartão: ${JSON.stringify(cardTransactions)}

      TAREFA:
      Gere 3 insights curtos (max 15 palavras) sobre onde economizar ou parabenizando o saldo.
    `

    // --- 4. Chamada com Modelo Atualizado (2.5) ---
    // Usamos 'gemini-2.5-flash' que é o padrão atual (lançado em meados de 2025)
    // Se quiser economizar ainda mais, poderia usar 'gemini-2.5-flash-lite'
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'), 
      schema: z.object({
        insights: z.array(z.string())
      }),
      prompt: prompt,
      temperature: 0.7,
    })

    // --- 5. Salvar Cache ---
    try {
        await supabase.from('ai_insights_cache').delete().eq('user_id', user.id)
        await supabase.from('ai_insights_cache').insert({
          user_id: user.id,
          insights: object.insights
        })
    } catch (err) {
        console.error("Cache ignorado:", err)
    }

    return new Response(JSON.stringify({ insights: object.insights }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error("Erro API Route:", error)
    return new Response(JSON.stringify({ 
        insights: ["Erro ao analisar dados.", "Tente novamente mais tarde."] 
    }), { status: 200 })
  }
}