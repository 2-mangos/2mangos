'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * Atualiza configurações do cartão. Essencial para que a função SQL
 * saiba quando fechar a fatura e quando é o vencimento.
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
 * Busca as estatísticas do cartão para o Dashboard.
 * Agora focado em buscar o valor real da fatura que aparece em /expenses.
 */
export async function getCardStats(accountName: string, month: number, year: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Intervalo do mês selecionado
  const startDate = new Date(year, month, 1).toISOString()
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  // 1. Busca a fatura (registro na tabela expenses)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, value')
    .eq('user_id', user.id)
    .eq('name', accountName)
    .eq('is_credit_card', true)
    .gte('date', startDate)
    .lte('date', endDate)

  const expenseIds = expenses?.map(e => e.id) || []
  const totalFatura = expenses?.reduce((acc, exp) => acc + (Number(exp.value) || 0), 0) || 0

  // 2. Gráfico de Categorias (Busca nas transações vinculadas a essa fatura)
  let categoryData: any[] = []
  if (expenseIds.length > 0) {
    const { data: transactions } = await supabase
      .from('card_transactions')
      .select('amount, category')
      .in('expense_id', expenseIds)

    const map = transactions?.reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
      return acc
    }, {}) || {}

    categoryData = Object.entries(map).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      color: '#6366f1'
    }))
  }

  // 3. Evolução dos últimos 6 meses (Para o gráfico de área)
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
      valor: mExp?.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || 0
    })
  }

  return { totalFatura, categoryData, evolutionData }
}

/**
 * Função de limpeza de cache manual. 
 * Garante que a lista de /expenses seja atualizada após o modal fechar.
 */
export async function refreshFinanceData() {
  revalidatePath('/expenses')
  revalidatePath('/cards')
}