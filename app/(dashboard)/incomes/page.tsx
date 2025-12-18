// CORREÇÃO: Caminhos ajustados para subir 3 níveis (../../../)
import { createClient } from '../../../lib/supabase-server'
import { redirect } from 'next/navigation'
import IncomesClient from './IncomesClient' // O Client continua na mesma pasta, então é ./
import { Income } from '../../../lib/types'

export default async function IncomesPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { redirect('/login') }

  // 1. Definição de Datas (Filtro Atual)
  const today = new Date()
  const selectedMonth = params.month ? parseInt(params.month) : today.getMonth()
  const selectedYear = params.year ? parseInt(params.year) : today.getFullYear()

  // Lógica de datas
  let startDate: string
  let endDate: string

  if (selectedYear === -1) {
      startDate = new Date(today.getFullYear() - 10, 0, 1).toISOString()
      endDate = new Date(today.getFullYear() + 10, 11, 31).toISOString()
  } else {
      if (selectedMonth === -1) {
          startDate = new Date(selectedYear, 0, 1).toISOString()
          endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999).toISOString()
      } else {
          startDate = new Date(selectedYear, selectedMonth, 1).toISOString()
          endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString()
      }
  }

  // 2. Query Principal
  const { data: incomesData } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  const incomes = (incomesData as Income[]) || []
  const totalSelected = incomes.reduce((acc, curr) => acc + curr.amount, 0)

  // 3. Query para KPI Anual
  const kpiYear = selectedYear === -1 ? today.getFullYear() : selectedYear
  const kpiStart = `${kpiYear}-01-01`
  const kpiEnd = `${kpiYear}-12-31`

  const { data: yearData } = await supabase
    .from('incomes')
    .select('amount')
    .eq('user_id', user.id)
    .gte('date', kpiStart)
    .lte('date', kpiEnd)

  const totalYear = yearData ? yearData.reduce((acc, curr) => acc + curr.amount, 0) : 0
  
  // Cálculo da Média Mensal
  let divisor = 12
  if (kpiYear === today.getFullYear()) {
      divisor = today.getMonth() + 1
  }
  const monthlyAverage = totalYear / divisor

  // 4. Renderizar Cliente
  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-6xl">
        <IncomesClient 
            initialIncomes={incomes}
            kpiData={{ totalSelected, totalYear, monthlyAverage }}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
        />
      </div>
    </div>
  )
}