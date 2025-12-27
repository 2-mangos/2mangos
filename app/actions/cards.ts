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
  
  const { error } = await supabase
    .from('accounts')
    .update(data)
    .eq('id', accountId)

  if (error) {
    console.error("Erro ao atualizar conta:", error.message)
    throw new Error(error.message)
  }
  
  revalidatePath('/cards')
}

/**
 * Busca todas as despesas vinculadas a um cartão dentro do ciclo da fatura atual.
 * Retorna os itens e a string do período formatada.
 */
export async function getCardInvoiceData(accountName: string, closingDay: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { items: [], period: "" }

  const now = new Date()
  let startMonth = now.getMonth()
  let startYear = now.getFullYear()

  // Lógica de ciclo de fatura:
  // Se hoje já passou do dia de fechamento, a fatura aberta é a que vence no próximo mês.
  if (now.getDate() > closingDay) {
    startMonth = now.getMonth()
  } else {
    startMonth = now.getMonth() - 1
  }

  // Define as datas de início (dia após o fechamento) e fim (dia do fechamento seguinte)
  const startDate = new Date(startYear, startMonth, closingDay + 1, 0, 0, 0)
  const endDate = new Date(startYear, startMonth + 1, closingDay, 23, 59, 59)

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .eq('name', accountName)
    .eq('is_credit_card', true)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .order('date', { ascending: false })

  if (error) {
    console.error("Erro ao buscar fatura:", error.message)
    return { items: [], period: "" }
  }

  const periodStr = `${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`

  return {
    items: expenses || [],
    period: periodStr
  }
}