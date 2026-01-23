'use server'

import { createClient } from '@/lib/supabase-server'

export async function getAccountYearlyData(year: number, month: number, accountName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  // Calcula o período dos últimos 12 meses terminando no mês selecionado
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  const startDate = new Date(year, month - 11, 1).toISOString()

  // Busca as despesas daquela conta no período de 12 meses
  const { data } = await supabase
    .from('expenses')
    .select('value, date')
    .eq('user_id', user.id)
    .eq('name', accountName)
    .gte('date', startDate)
    .lte('date', endDate)

  const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  const chartData = []

  // Gera os 12 meses retroativos a partir do selecionado
  for (let i = 11; i >= 0; i--) {
    const d = new Date(year, month - i, 1)
    const m = d.getMonth()
    const y = d.getFullYear()
    
    const value = data?.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate.getMonth() === m && itemDate.getFullYear() === y
    }).reduce((acc, curr) => acc + curr.value, 0) || 0

    chartData.push({
      name: shortMonthNames[m],
      value
    })
  }

  return chartData
}