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
 * Busca as estatísticas do cartão para o Dashboard de forma otimizada.
 * Corrigido problema de N+1 queries e desestruturação insegura de autenticação.
 */
export async function getCardStats(accountName: string, month: number, year: number) {
  const supabase = await createClient()
  
  // CORREÇÃO #7: Desestruturação segura do getUser
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data?.user) return null
  const user = data.user

  // Intervalo do mês selecionado
  const startDate = new Date(year, month, 1).toISOString()
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  // 1. Busca a fatura (registro na tabela expenses) para o mês atual
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

  // CORREÇÃO #3: Resolução do N+1. Uma única query para os 6 meses.
  const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  
  // Calcular os extremos do período histórico (5 meses atrás até o final do mês atual)
  const baseHistoryDate = new Date(year, month - 5, 1)
  const historyStart = new Date(baseHistoryDate.getFullYear(), baseHistoryDate.getMonth(), 1).toISOString()
  const historyEnd = endDate // Reutiliza o final do mês selecionado

  const { data: allHistoryExpenses } = await supabase
    .from('expenses')
    .select('value, date')
    .eq('user_id', user.id)
    .eq('name', accountName)
    .gte('date', historyStart)
    .lte('date', historyEnd)

  const evolutionData = []

  // Agrupamento e soma efetuados totalmente em memória
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - i, 1)
    const m = d.getMonth()
    const y = d.getFullYear()

    // Filtra em memória as despesas pertencentes ao mês/ano da iteração específica
    const monthExpenses = allHistoryExpenses?.filter(exp => {
      const expDate = new Date(exp.date)
      return expDate.getMonth() === m && expDate.getFullYear() === y
    }) || []

    evolutionData.push({
      name: monthLabels[m],
      valor: monthExpenses.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
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