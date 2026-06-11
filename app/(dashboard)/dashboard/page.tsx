import { createClient } from '../../../lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import { Account } from '../../../lib/types' // CORREÇÃO #4: Importando tipo oficial do projeto

// Definições de tipos auxiliares para remover todos os 'any'
interface ExpenseItem {
  id: string
  value: number
  date: string
  name: string
  is_credit_card: boolean
  type: string
}

interface IncomeItem {
  amount: number
  description: string
  date?: string
}

interface CardTransactionItem {
  amount: number
  category: string
  description: string
  created_at: string
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  
  // CORREÇÃO #7: Padrão seguro de verificação de erro/auth
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) { redirect('/login') }
  const user = authData.user

  const today = new Date()
  const selectedMonth = params.month ? parseInt(params.month) : today.getMonth()
  const selectedYear = params.year ? parseInt(params.year) : today.getFullYear()

  const startCurrentDate = new Date(selectedYear, selectedMonth, 1).toISOString()
  const endCurrentDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString()
  const startLastDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString()
  const endLastDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999).toISOString()

  const startChartDate = new Date(selectedYear, selectedMonth - 11, 1).toISOString()
  const endChartDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString()

  const [
    userQuery,
    currentExpensesQuery,
    lastExpensesQuery,
    currentIncomesQuery,
    allExpensesChartQuery,
    allIncomesChartQuery,
    accountsQuery,
    nextExpenseQuery
  ] = await Promise.all([
    supabase.from('users').select('plano, full_name, username').eq('id', user.id).single(),
    supabase.from('expenses').select('id, value, date, name, is_credit_card, type').eq('user_id', user.id).gte('date', startCurrentDate).lte('date', endCurrentDate),
    supabase.from('expenses').select('value').eq('user_id', user.id).gte('date', startLastDate).lte('date', endLastDate),
    supabase.from('incomes').select('amount, description').eq('user_id', user.id).gte('date', startCurrentDate).lte('date', endCurrentDate),
    supabase.from('expenses').select('value, date').eq('user_id', user.id).gte('date', startChartDate).lte('date', endChartDate),
    supabase.from('incomes').select('amount, date').eq('user_id', user.id).gte('date', startChartDate).lte('date', endChartDate),
    supabase.from('accounts').select('id, name, credit_limit, is_credit_card, monthly_budget, color, icon, default_type, order_index').eq('user_id', user.id).order('name'),
    supabase.from('expenses').select('name, date, value').eq('user_id', user.id).eq('status', 'pendente').gte('date', new Date().toISOString().split('T')[0]).order('date', { ascending: true }).limit(1).maybeSingle()
  ])

  // Conversões seguras de dados com tipagem estrita
  const userData = userQuery.data
  const currentExpenses = (currentExpensesQuery.data as ExpenseItem[]) || []
  const lastExpenses = lastExpensesQuery.data || []
  const currentIncomes = (currentIncomesQuery.data as IncomeItem[]) || []
  const allExpensesChart = allExpensesChartQuery.data || [] // CORRIGIDO AQUI!
  const allIncomesChart = allIncomesChartQuery.data || []
  const accountsData = (accountsQuery.data as Account[]) || []
  const nextExpenseData = nextExpenseQuery.data

  // TIPAGEM: Removido os 'any' de acumuladores e loops
  const sumCurrent = currentExpenses.reduce((acc: number, curr: ExpenseItem) => acc + curr.value, 0)
  const sumLast = lastExpenses.reduce((acc: number, curr: { value: number }) => acc + curr.value, 0)
  const totalIncome = currentIncomes.reduce((acc: number, curr: IncomeItem) => acc + curr.amount, 0)
  
  const incomeMap = new Map<string, number>()
  currentIncomes.forEach((item: IncomeItem) => {
      const name = item.description || 'Outros'
      incomeMap.set(name, (incomeMap.get(name) || 0) + item.amount)
  })

  const incomeSources = Array.from(incomeMap.entries())
      .map(([name, value]: [string, number]) => ({ 
          name, 
          value,
          percent: totalIncome > 0 ? (value / totalIncome) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)

  const fixedExpenses = currentExpenses.filter((e: ExpenseItem) => e.type === 'fixa')
  const variableExpenses = currentExpenses.filter((e: ExpenseItem) => e.type === 'variavel')

  const fixedTotal = fixedExpenses.reduce((acc: number, curr: ExpenseItem) => acc + curr.value, 0)
  const variableTotal = variableExpenses.reduce((acc: number, curr: ExpenseItem) => acc + curr.value, 0)

  const topFixedList = Array.from(fixedExpenses.reduce((map: Map<string, number>, item: ExpenseItem) => {
    map.set(item.name, (map.get(item.name) || 0) + item.value); return map;
  }, new Map<string, number>()).entries())
  .map(([name, value]: [string, number]) => ({ name, value }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 3)

  const topVariableList = Array.from(variableExpenses.reduce((map: Map<string, number>, item: ExpenseItem) => {
    map.set(item.name, (map.get(item.name) || 0) + item.value); return map;
  }, new Map<string, number>()).entries())
  .map(([name, value]: [string, number]) => ({ name, value }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 3)

  const percentageChange = sumLast === 0 ? (sumCurrent > 0 ? 100 : 0) : ((sumCurrent - sumLast) / sumLast) * 100
  const highestExpense = currentExpenses.length > 0 ? currentExpenses.reduce((prev: ExpenseItem, current: ExpenseItem) => (prev.value > current.value) ? prev : current) : null

  let healthScore = 50
  if (totalIncome > 0) {
    if (sumCurrent > totalIncome) healthScore = Math.max(0, 50 - ((sumCurrent / totalIncome - 1) * 50))
    else healthScore = Math.min(100, 50 + (((totalIncome - sumCurrent) / totalIncome / 0.3) * 50))
  }
  healthScore = Math.round(healthScore)

  const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  
  const chartData = []
  for (let i = 11; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()

      const expense = allExpensesChart?.filter((e: any) => {
          const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y
      }).reduce((acc: number, curr: any) => acc + curr.value, 0) || 0

      const income = allIncomesChart?.filter((inc: any) => {
          const id = new Date(inc.date); return id.getMonth() === m && id.getFullYear() === y
      }).reduce((acc: number, curr: any) => acc + curr.amount, 0) || 0

      chartData.push({ name: shortMonthNames[m], income: Number(income), expense: Number(expense) })
  }

  const catMap = new Map<string, number>()
  currentExpenses.forEach((exp: ExpenseItem) => { catMap.set(exp.name, (catMap.get(exp.name) || 0) + exp.value) })
  
  const allCategorySpends = Array.from(catMap.entries()).map(([name, value]: [string, number]) => ({ name, value }))
  
  const topCategories = allCategorySpends
    .map((item) => ({ ...item, percent: sumCurrent > 0 ? (item.value / sumCurrent) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const creditExpenseIds = currentExpenses.filter((e: ExpenseItem) => e.is_credit_card).map((e: ExpenseItem) => e.id)
  let ccTransactions: CardTransactionItem[] = []
  if (creditExpenseIds.length > 0) {
      const { data: trans } = await supabase.from('card_transactions').select('amount, category, description, created_at').in('expense_id', creditExpenseIds)
      ccTransactions = (trans as CardTransactionItem[]) || []
  }
  
  const ccCatMap = new Map<string, number>()
  ccTransactions.forEach(t => ccCatMap.set(t.category, (ccCatMap.get(t.category) || 0) + t.amount))
  
  const ccCategoryData = Array.from(ccCatMap.entries())
    .map(([name, value]: [string, number]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const ccTotal = ccTransactions.reduce((acc: number, curr: CardTransactionItem) => acc + curr.amount, 0)

  const accountsList = accountsData
  const accountNames = accountsList.map((a: Account) => a.name)
  const totalCreditLimit = accountsList.filter((a: Account) => a.is_credit_card).reduce((acc: number, curr: Account) => acc + (curr.credit_limit || 0), 0)

  const dashboardData = {
    currentMonthTotal: sumCurrent,
    percentageChange,
    highestExpense: highestExpense ? { name: highestExpense.name, value: highestExpense.value } : null,
    nextDue: nextExpenseData,
    totalIncome,
    incomeSources, 
    healthScore,
    chartData,
    topCategories,
    allCategorySpends,
    accountsList,
    ccCategoryData,
    ccTotal,
    ccTransactions,
    accountNames,
    totalCreditLimit,
    expenseTypeBreakdown: { 
        fixed: fixedTotal, 
        variable: variableTotal,
        topFixed: topFixedList,     
        topVariable: topVariableList 
    }
  }

  // CORREÇÃO: Acessando diretamente o objeto de retorno do Supabase (.single() não devolve propriedade encadeada .data.data)
  let displayName = 'Usuário'
  if (userData?.full_name) displayName = userData.full_name.split(' ')[0]
  else if (userData?.username) displayName = userData.username

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="min-h-screen p-8 pb-32">
        <DashboardClient 
          data={dashboardData} 
          userProfile={{ name: displayName, plan: userData?.plano || 'free' }}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>
    </div>
  )
}