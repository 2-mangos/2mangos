'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * Atualiza as configurações de limite e datas de um cartão específico.
 */
export async function updateCardSettings(accountId: string, data: {
  credit_limit?: number
  closing_day?: number
  due_day?: number
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').update(data).eq('id', accountId)
  if (error) throw new Error(error.message)
  revalidatePath('/cards')
}

/**
 * Busca estatísticas consolidadas para os gráficos: Fatura, Categorias e Evolução.
 */
export async function getCardStats(accountName: string, month: number, year: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const startDate = new Date(year, month, 1).toISOString()
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  // 1. Busca a despesa principal do cartão
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, value')
    .eq('user_id', user.id)
    .eq('name', accountName)
    .gte('date', startDate)
    .lte('date', endDate)

  const expenseIds = expenses?.map(e => e.id) || []
  const totalFatura = expenses?.reduce((acc, exp) => acc + exp.value, 0) || 0

  // 2. Busca as transações detalhadas para as Categorias
  let categoryData: any[] = []
  if (expenseIds.length > 0) {
    const { data: transactions } = await supabase
      .from('card_transactions')
      .select('amount, category')
      .in('expense_id', expenseIds)

    const categoriesMap = transactions?.reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {}) || {}

    const colors = ['#6366f1', '#818cf8', '#a5b4fc', '#312e81', '#4f46e5', '#818cf8']
    categoryData = Object.entries(categoriesMap).map(([name, value], index) => ({
      name: name.toUpperCase(),
      value,
      color: colors[index % colors.length]
    }))
  }

  // 3. Evolução dos últimos 6 meses
  const evolutionData = []
  const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - i, 1)
    const m = d.getMonth()
    const y = d.getFullYear()
    const start = new Date(y, m, 1).toISOString()
    const end = new Date(y, m + 1, 0).toISOString()

    const { data: mExp } = await supabase
      .from('expenses')
      .select('value')
      .eq('user_id', user.id)
      .eq('name', accountName)
      .gte('date', start)
      .lte('date', end)

    evolutionData.push({
      name: monthLabels[m],
      valor: mExp?.reduce((acc, curr) => acc + curr.value, 0) || 0
    })
  }

  return { totalFatura, categoryData, evolutionData }
}