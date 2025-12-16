import { createClient } from '@/lib/supabase-server'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 1. VERIFICAR CACHE (12 Horas)
    const CACHE_DURATION_HOURS = 12; 
    const { data: cachedData } = await supabase
      .from('ai_insights_cache')
      .select('insights, last_updated')
      .eq('user_id', user.id)
      .single()

    if (cachedData) {
      const hoursDiff = (new Date().getTime() - new Date(cachedData.last_updated).getTime()) / (1000 * 60 * 60);
      if (hoursDiff < CACHE_DURATION_HOURS) {
        return Response.json({ insights: cachedData.insights, source: 'cache' })
      }
    }

    // 2. BUSCAR DADOS
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

    const [expenses, incomes, userData] = await Promise.all([
        supabase.from('expenses').select('name, value').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('users').select('full_name').eq('id', user.id).single()
    ])

    const totalExpenses = expenses.data?.reduce((acc, curr) => acc + curr.value, 0) || 0
    const totalIncome = incomes.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0
    const balance = totalIncome - totalExpenses

    // Agrupamento simples para economizar tokens
    const categoryMap = new Map();
    expenses.data?.forEach(e => categoryMap.set(e.name, (categoryMap.get(e.name) || 0) + e.value));
    const topExpenses = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // 3. GERAR INSIGHTS (JSON ESTRUTURADO)
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: z.object({
        tips: z.array(z.string())
      }),
      prompt: `
        Analista Financeiro Pessoal.
        Usuário: ${userData.data?.full_name}.
        Receita: ${totalIncome}, Despesa: ${totalExpenses}, Saldo: ${balance}.
        Top Gastos: ${JSON.stringify(topExpenses)}.

        Gere 9 dicas curtas e diretas (max 10 palavras cada) sobre as finanças atuais.
        Foque em alertas, economia e parabéns se saldo positivo.
      `,
    })

    // 4. SALVAR CACHE
    await supabase.from('ai_insights_cache').upsert({ 
        user_id: user.id, 
        insights: object.tips, 
        last_updated: new Date().toISOString() 
    })

    return Response.json({ insights: object.tips, source: 'generated' })

  } catch (error: any) {
    console.error("Erro API:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}