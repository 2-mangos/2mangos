import { createClient } from '../../../lib/supabase-server'
import { redirect } from 'next/navigation'
import IncomesClient from './IncomesClient'
import { Income } from '../../../lib/types'

export default async function IncomesPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { redirect('/login') }

  // 1. Definição de Datas (Filtro)
  const today = new Date()
  const selectedMonth = params.month ? parseInt(params.month) : today.getMonth()
  const selectedYear = params.year ? parseInt(params.year) : today.getFullYear()

  let startDate: string
  let endDate: string

  if (selectedYear === -1) {
      startDate = new Date(today.getFullYear() - 10, 0, 1).toISOString()
      endDate = new Date(today.getFullYear() + 10, 11, 31).toISOString()
  } else {
      if (selectedMonth === -1) {
          // Correção: Definição manual para evitar distorção de timezone
          startDate = `${selectedYear}-01-01T00:00:00.000Z`
          endDate = `${selectedYear}-12-31T23:59:59.999Z`
      } else {
          // Correção: Formatação do mês e cálculo do último dia com segurança
          const month = String(selectedMonth + 1).padStart(2, '0');
          const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
          
          startDate = `${selectedYear}-${month}-01T00:00:00.000Z`;
          endDate = `${selectedYear}-${month}-${lastDay}T23:59:59.999Z`;
      }
  }

  // 2. Query de Lançamentos (Tabela)
  const { data: incomesData } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  const incomes = (incomesData as Income[]) || []

  // 3. Query KPI Anual (Fluxo Financeiro)
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
  
  // Média Mensal
  let divisor = 12
  if (kpiYear === today.getFullYear()) {
      divisor = today.getMonth() + 1
  }
  const monthlyAverage = totalYear / divisor

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-6xl">
        <IncomesClient 
            initialIncomes={incomes}
            kpiData={{ totalYear, monthlyAverage }}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
        />
      </div>
    </div>
  )
}