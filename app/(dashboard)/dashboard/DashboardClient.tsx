'use client'

import { useRouter } from 'next/navigation'
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, Cell, AreaChart, Area, PieChart, Pie, BarChart, Bar
} from 'recharts'
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  AlertTriangle, Lightbulb, Activity, Lock, 
  ArrowLeft, Zap, ChevronRight, ChevronDown, CreditCard,
  CalendarClock, AlertCircle, Target, CheckCircle, ArrowUpRight,
  User, Plus 
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../../lib/utils'
import { useState, useEffect, useMemo, useTransition } from 'react'
import UpgradeModal from '../../../components/UpgradeModal'
import { getAccountYearlyData } from '../../actions/dashboard-data'

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

const colors = { red: '#f43f5e', green: '#10b981', yellow: '#f59e0b', indigo: '#6366f1', slate: '#3f3f46' }
const cardClassBase = "card relative flex flex-col justify-between"
const iconBadgeClass = "absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5"

interface DashboardProps {
  data: {
    currentMonthTotal: number
    percentageChange: number
    highestExpense: { name: string, value: number } | null
    nextDue: { name: string, date: string, value: number } | null
    totalIncome: number
    incomeSources: { name: string, value: number, percent: number }[]
    healthScore: number
    chartData: any[]
    topCategories: any[]
    allCategorySpends: { name: string, value: number }[]
    accountsList: any[]
    ccCategoryData: any[]
    ccTotal: number
    ccTransactions: any[]
    accountNames: string[]
    totalCreditLimit: number
    expenseTypeBreakdown: { 
        fixed: number, 
        variable: number, 
        topFixed: {name: string, value: number}[], 
        topVariable: {name: string, value: number}[] 
    }
  }
  userProfile: { name: string, plan: string }
  selectedMonth: number
  selectedYear: number
}

const InsightBar = ({ text }: { text: string }) => (
  <div className="group flex items-center gap-3 bg-indigo-500/10 px-3 py-2.5 rounded-xl border border-indigo-500/20 backdrop-blur-sm animate-in fade-in transition-colors hover:bg-indigo-500/15 cursor-default">
      <div className="relative shrink-0">
          <Lightbulb 
            size={16} 
            className="text-indigo-400 transition-all duration-500 ease-out group-hover:text-amber-300 group-hover:drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]" 
          />
      </div>
      <p className="text-xs font-medium text-indigo-200 leading-snug line-clamp-2 group-hover:text-indigo-100 transition-colors">
        {text}
      </p>
  </div>
)

export default function DashboardClient({ data, userProfile, selectedMonth, selectedYear }: DashboardProps) {
  const router = useRouter()
  
  const [chartFilter, setChartFilter] = useState('all')
  const [selectedAccount, setSelectedAccount] = useState(data.accountNames[0] || '')
  const [specificChartData, setSpecificChartData] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedCcCategory, setSelectedCcCategory] = useState<string | null>(null)
  
  const currentResult = data.totalIncome - data.currentMonthTotal
  const isSpendingMore = data.percentageChange > 0
  const activeCreditLimit = data.totalCreditLimit > 0 ? data.totalCreditLimit : 0;
  
  const maxCcValue = Math.max(...(data.ccCategoryData.map(c => c.value) || [0]), 1)
  const getCcBarColor = (value: number) => {
      const ratio = value / maxCcValue
      if (ratio > 0.8) return '#6366f1'
      if (ratio > 0.5) return '#818cf8'
      return '#a5b4fc'
  }

  const daysUntilDue = useMemo(() => {
    if (!data.nextDue) return null
    const today = new Date()
    today.setHours(0,0,0,0)
    const dueDate = new Date(data.nextDue.date)
    dueDate.setHours(0,0,0,0)
    const diffTime = dueDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 
  }, [data.nextDue])

  let dueText = ""
  let dueColorClass = "text-indigo-400"
  
  if (daysUntilDue !== null) {
      if (daysUntilDue < 0) { dueText = "Atrasado"; dueColorClass = "text-red-500"; }
      else if (daysUntilDue === 0) { dueText = "Vence hoje"; dueColorClass = "text-yellow-500"; }
      else if (daysUntilDue === 1) { dueText = "Vence amanhã"; dueColorClass = "text-indigo-400"; }
      else { dueText = `Em ${daysUntilDue} dias`; dueColorClass = "text-zinc-400"; }
  }

  const activeBudgets = useMemo(() => {
    return data.accountsList
        .filter(acc => acc.monthly_budget && acc.monthly_budget > 0)
        .map(acc => {
            const spend = data.allCategorySpends.find(c => c.name === acc.name)?.value || 0
            const percent = (spend / acc.monthly_budget) * 100
            const isOver = spend > acc.monthly_budget
            
            return {
                name: acc.name,
                budget: acc.monthly_budget,
                spend,
                percent,
                isOver,
                color: acc.color,
                is_card: acc.is_credit_card
            }
        })
        .sort((a, b) => b.percent - a.percent) 
  }, [data.accountsList, data.allCategorySpends])

  const expenseTypeData = [
    { name: 'Recorrentes', value: data.expenseTypeBreakdown.fixed },
    { name: 'Variáveis', value: data.expenseTypeBreakdown.variable },
  ].filter(d => d.value > 0)

  const COLORS_PIE = ['#6366f1', '#f43f5e']

  const expensesInsight = useMemo(() => {
    let deficitStreak = 0;
    const activeMonths = data.chartData.filter(d => d.expense > 0 || d.income > 0).slice(-3);
    activeMonths.forEach(m => { if (m.expense > m.income) deficitStreak++; });

    if (deficitStreak >= 3) return "Alerta: Há 3 meses suas despesas superam as receitas.";
    if (deficitStreak === 2) return "Cuidado: 2º mês seguido de despesas acima da receita.";
    if (data.totalIncome > 0 && data.currentMonthTotal > data.totalIncome) return `Atenção: Suas despesas já superaram sua receita deste período.`;
    if (data.percentageChange > 25) return `Suas despesas subiram ${data.percentageChange.toFixed(0)}% comparado ao período anterior.`;
    if (data.percentageChange < -10) return `Ótimo! Você reduziu suas despesas em ${Math.abs(data.percentageChange).toFixed(0)}% neste período.`;
    return "Suas despesas estão estáveis e dentro da média.";
  }, [data.chartData, data.currentMonthTotal, data.totalIncome, data.percentageChange]);

  const miniInsight = useMemo(() => {
    const result = data.totalIncome - data.currentMonthTotal;
    const highest = data.highestExpense;
    if (result < 0) return `Alerta: Resultado negativo! ${highest?.name || 'Maior despesa'} impactou seu orçamento.`;
    if (highest && highest.value > (data.currentMonthTotal * 0.4)) return `Atenção: ${highest.name} representa mais de 40% das despesas.`;
    if (result > 0 && result < (data.totalIncome * 0.1)) return `Resultado positivo, mas apertado. Cuidado com ${highest?.name}.`;
    return `Ótimo fluxo! Resultado positivo e controle sobre as despesas.`;
  }, [data.totalIncome, data.currentMonthTotal, data.highestExpense]);

  const profileInsight = useMemo(() => {
    const fixed = data.expenseTypeBreakdown.fixed || 0;
    const variable = data.expenseTypeBreakdown.variable || 0;
    const total = fixed + variable;
    if (total === 0) return "Sem dados suficientes.";
    const fixedPercent = (fixed / total) * 100;
    const variablePercent = (variable / total) * 100;
    if (fixedPercent > 70) return `Alerta: ${fixedPercent.toFixed(0)}% das despesas são recorrentes. Rigidez orçamentária.`;
    if (variablePercent > 60) return `Atenção: Variáveis são ${variablePercent.toFixed(0)}%. Tente cortar supérfluos.`;
    return `Equilíbrio: ${fixedPercent.toFixed(0)}% Recorrentes vs ${variablePercent.toFixed(0)}% Variáveis.`;
  }, [data.expenseTypeBreakdown]);

  const incomeActionsInsight = useMemo(() => {
    if (data.incomeSources.length === 0) {
        return "Dica: Crie lançamentos rapidamente com o botão de atalho para começar a ver análises aqui."
    }
    const top = data.incomeSources[0]
    const second = data.incomeSources[1]
    
    if (top.percent > 60) {
        return `${top.name} é sua principal fonte de renda. Use os atalhos para manter seus registros sempre atualizados.`
    }
    if (second) {
        return `Diversificado! ${top.name} e ${second.name} são suas maiores rendas. Use os atalhos para novos lançamentos.`
    }
    return `Você possui ${data.incomeSources.length} fontes de renda identificadas. Use o atalho para agilizar a gestão.`
  }, [data.incomeSources])

  useEffect(() => {
    if (selectedAccount) {
      startTransition(async () => {
        // CORREÇÃO: Passando o mês selecionado para a busca de 12 meses
        const chartData = await getAccountYearlyData(selectedYear, selectedMonth, selectedAccount)
        setSpecificChartData(chartData)
      })
    }
  }, [selectedAccount, selectedYear, selectedMonth])

  function handleFilterChange(month: number, year: number) {
    router.push(`/dashboard?month=${month}&year=${year}`)
  }

  const getGroupedTransactions = (category: string) => {
    const rawList = data.ccTransactions.filter(t => t.category === category)
    return rawList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const categoryDailyEvolution = useMemo(() => {
    if (!selectedCcCategory) return []
    const transactions = data.ccTransactions.filter(t => t.category === selectedCcCategory)
    const daysMap = new Map<number, number>()
    transactions.forEach(t => {
      const day = new Date(t.created_at).getDate()
      daysMap.set(day, (daysMap.get(day) || 0) + t.amount)
    })
    return Array.from(daysMap.entries())
      .map(([day, value]) => ({ day: `Dia ${day}`, value }))
      .sort((a, b) => parseInt(a.day.split(' ')[1]) - parseInt(b.day.split(' ')[1]))
  }, [selectedCcCategory, data.ccTransactions])

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear
  const dayCount = isCurrentMonth ? today.getDate() : daysInMonth
  const dailyAvg = data.ccTotal / (dayCount || 1)
  const projection = isCurrentMonth ? dailyAvg * daysInMonth : data.ccTotal
  const limitUsedPercent = activeCreditLimit > 0 ? (data.ccTotal / activeCreditLimit) * 100 : 0
  const limitAvailable = activeCreditLimit - data.ccTotal
  
  let limitBarColor = 'bg-indigo-500'
  if (limitUsedPercent > 100) limitBarColor = 'bg-red-600'
  else if (limitUsedPercent > 80) limitBarColor = 'bg-red-500'
  else if (limitUsedPercent > 50) limitBarColor = 'bg-yellow-500'

  const dynamicInsightText = useMemo(() => {
    if (selectedCcCategory) {
       const catVal = data.ccCategoryData.find(c => c.name === selectedCcCategory)?.value || 0
       const percent = data.ccTotal > 0 ? ((catVal / data.ccTotal) * 100).toFixed(1) : '0'
       return `Você gastou ${formatCurrency(catVal)} em ${selectedCcCategory}. Isso representa ${percent}% da sua fatura.`
    }
    if (projection > activeCreditLimit && activeCreditLimit > 0) return `Atenção: Projeção de ${formatCurrency(projection)} pode estourar limite.`
    if (isCurrentMonth && projection > data.ccTotal * 1.2) return `Cuidado: Despesas diárias (${formatCurrency(dailyAvg)}) acima da média.`
    return "Fatura sob controle. Seus gastos no cartão estão dentro do esperado."
  }, [selectedCcCategory, projection, dailyAvg, data.ccTotal, data.ccCategoryData, activeCreditLimit, isCurrentMonth])

  let scoreTextColor = 'text-red-400', scoreLabel = 'Crítico', scoreDesc = 'Despesas excedendo Receitas.'
  if (data.healthScore >= 80) { scoreTextColor = 'text-indigo-400'; scoreLabel = 'Excelente'; scoreDesc = 'Parabéns! Poupando muito.' }
  else if (data.healthScore >= 50) { scoreTextColor = 'text-yellow-400'; scoreLabel = 'Atenção'; scoreDesc = 'No limite.' }

  const getMonochromeColor = (index: number) => {
    const opacities = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];
    return opacities[index % opacities.length];
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Visão Geral</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
            <p className="text-zinc-400 text-sm">Olá, <strong className="text-zinc-200">{userProfile.name}</strong></p>
            <span className="hidden sm:block text-zinc-600">•</span>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/10">
               <Lightbulb size={10} strokeWidth={3}/> {currentResult < 0 ? 'Resultado negativo.' : 'Resultado positivo.'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative group cursor-help text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">Score</span>
              <div className={`text-3xl font-bold ${scoreTextColor} leading-none flex items-center justify-end gap-2`}>
                  <Activity size={20} className="opacity-50" /> {data.healthScore}
              </div>
              <div className="absolute top-full right-0 mt-3 w-64 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none text-left">
                  <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase">Saúde Financeira</span>
                      <span className={`text-xs font-bold ${scoreTextColor}`}>{scoreLabel}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 mb-3 overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${data.healthScore >= 80 ? 'bg-indigo-500' : data.healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${data.healthScore}%` }}></div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{scoreDesc}</p>
              </div>
          </div>

          <div className="flex items-center bg-zinc-900/50 border border-white/5 rounded-lg p-1">
             <div className="relative">
                <select value={selectedMonth} onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} className="bg-transparent text-zinc-300 text-sm font-medium py-1.5 pl-3 pr-2 cursor-pointer hover:text-white outline-none [&>option]:bg-zinc-900">
                  {monthNames.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
             </div>
             <div className="relative">
                <select value={selectedYear} onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} className="bg-transparent text-zinc-300 text-sm font-medium py-1.5 pl-2 pr-6 cursor-pointer hover:text-white outline-none [&>option]:bg-zinc-900">
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        
        {/* COLUNA ESQUERDA */}
        <div className="flex flex-col gap-4">
          
          <div className={`${cardClassBase} h-52 p-5`}>
            <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Despesas</p>
                <h3 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(data.currentMonthTotal)}</h3>
                
                <div className={`inline-flex items-center gap-1.5 text-xs font-medium mt-1 ${isSpendingMore ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isSpendingMore ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                    {Math.abs(data.percentageChange).toFixed(1)}% 
                    <span className="text-zinc-500 font-normal">vs. anterior</span>
                </div>
            </div>
            <div className="absolute top-5 right-5 w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5"><DollarSign size={18} strokeWidth={2} /></div>
            <div className="mt-auto">
                <InsightBar text={expensesInsight} />
            </div>
          </div>

          <div className="card h-[440px] flex flex-col p-5">
              <div className="flex items-start justify-between mb-4 shrink-0">
                  <div>
                    <h3 className="text-base font-semibold text-white">Perfil de Despesas</h3>
                    {/* Rótulo corrigido para Últimos 12 meses */}
                    <p className="text-xs text-zinc-500">Últimos 12 meses</p>
                  </div>
              </div>
              
              {expenseTypeData.length > 0 ? (
                  <div className="flex flex-1 gap-4 min-h-0 mb-3 items-center">
                      <div className="w-[45%] h-[160px] relative shrink-0 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie 
                                      data={expenseTypeData} 
                                      cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke='none'
                                  >
                                      {expenseTypeData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: '12px' }} formatter={(value: number, name: string) => [formatCurrency(value), name] as [string, string]} />
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="text-center">
                                 <span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Total</span>
                                 <span className="text-xs font-bold text-zinc-200">{formatCurrency(data.currentMonthTotal)}</span>
                             </div>
                          </div>
                      </div>

                      <div className="w-[55%] overflow-y-auto custom-scrollbar pr-1 space-y-4 pt-1">
                          {data.expenseTypeBreakdown.fixed > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs pb-1 border-b border-white/5">
                                    {/* Nomenclatura corrigida para Recorrentes */}
                                    <span className="text-indigo-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                       <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Recorrentes
                                    </span>
                                    <span className="text-[10px] text-zinc-500">{((data.expenseTypeBreakdown.fixed / data.currentMonthTotal) * 100).toFixed(0)}%</span>
                                </div>
                                <span className="text-zinc-300 font-semibold text-xs block mb-1">{formatCurrency(data.expenseTypeBreakdown.fixed)}</span>
                                <ul className="space-y-1.5">{data.expenseTypeBreakdown.topFixed.map((item, idx) => (<li key={idx} className="flex justify-between items-center text-[10px] group"><span className="text-zinc-400 truncate max-w-[80px] group-hover:text-zinc-200 transition-colors">{item.name}</span><span className="text-zinc-500 group-hover:text-white transition-colors">{formatCurrency(item.value)}</span></li>))}</ul>
                            </div>
                          )}
                          {data.expenseTypeBreakdown.variable > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs pb-1 border-b border-white/5">
                                    <span className="text-rose-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span> Variáveis
                                    </span>
                                    <span className="text-[10px] text-zinc-500">{((data.expenseTypeBreakdown.variable / data.currentMonthTotal) * 100).toFixed(0)}%</span>
                                </div>
                                <span className="text-zinc-300 font-semibold text-xs block mb-1">{formatCurrency(data.expenseTypeBreakdown.variable)}</span>
                                <ul className="space-y-1.5">{data.expenseTypeBreakdown.topVariable.map((item, idx) => (<li key={idx} className="flex justify-between items-center text-[10px] group"><span className="text-zinc-400 truncate max-w-[80px] group-hover:text-zinc-200 transition-colors">{item.name}</span><span className="text-zinc-500 group-hover:text-white transition-colors">{formatCurrency(item.value)}</span></li>))}</ul>
                            </div>
                          )}
                      </div>
                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-3">
                      <AlertCircle size={32} className="opacity-50"/>
                      <p className="text-xs text-center max-w-[180px]">Classifique suas contas como Recorrentes ou Variáveis para ver a análise aqui.</p>
                  </div>
              )}

              <div className="mt-auto pt-4">
                  <InsightBar text={profileInsight} />
              </div>
          </div>

          {activeBudgets.length > 0 && (
             <div className="card p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div>
                        <h3 className="text-base font-semibold text-white">Metas</h3>
                        <p className="text-xs text-zinc-500">Orçamento por categoria</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1 shrink-0">
                    <span>Categoria</span>
                    <span className="text-center">Meta</span>
                    <span className="text-right">Realizado</span>
                </div>
                
                <div className="overflow-y-auto custom-scrollbar pr-1 space-y-0.5 h-[195px]">
                    {activeBudgets.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-3 items-center py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5 px-1 rounded-lg transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                                <span className="text-xs font-medium text-zinc-200 truncate" title={item.name}>
                                    {item.name}
                                    {item.is_card && <CreditCard size={10} className="inline ml-1 text-purple-400"/>}
                                </span>
                            </div>
                            <div className="text-center text-xs text-zinc-400">
                                {formatCurrency(item.budget)}
                            </div>
                            <div className="text-right flex items-center justify-end gap-1.5">
                                <span className={`text-xs font-bold ${item.isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {formatCurrency(item.spend)}
                                </span>
                                {item.isOver && (
                                    <Tooltip content="Limite excedido!">
                                        <AlertCircle size={12} className="text-red-500 animate-pulse" />
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          )}

        </div>

        {/* COLUNA DIREITA */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          <div className="grid grid-cols-3 gap-3">
             <div className={`${cardClassBase} h-28 p-4`}>
                <div className="space-y-0.5"><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Resultado</p><h3 className={`text-xl font-bold tracking-tight ${currentResult < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(currentResult)}</h3></div>
                <div className={iconBadgeClass}><Wallet size={16} strokeWidth={2} /></div>
             </div>
             
             <div className={`${cardClassBase} h-28 p-4`}>
                <div className="w-full space-y-0.5"><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Maior despesa</p>{data.highestExpense ? (<><h3 className="text-xs font-semibold text-zinc-200 truncate pr-6" title={data.highestExpense.name}>{data.highestExpense.name}</h3><p className="text-lg font-bold text-zinc-100">{formatCurrency(data.highestExpense.value)}</p></>) : <span className="text-xs text-zinc-600">--</span>}</div>
                <div className={iconBadgeClass}><AlertTriangle size={16} strokeWidth={2} /></div>
             </div>
             
             <div className={`${cardClassBase} h-28 p-4`}>
               {data.nextDue ? (
                 <>
                   <div className="w-full space-y-0.5">
                       <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                           Próximo Vencimento
                       </p>
                       <h3 className="text-xs font-semibold text-zinc-200 truncate pr-6" title={data.nextDue.name}>
                           {data.nextDue.name}
                       </h3>
                       <div className="flex items-baseline gap-1.5">
                           <p className="text-lg font-bold text-zinc-100">
                               {formatCurrency(data.nextDue.value)}
                           </p>
                       </div>
                       <p className={`text-[10px] font-medium ${dueColorClass}`}>
                          {dueText}
                       </p>
                   </div>
                   <div className={`absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/5 ${daysUntilDue !== null && daysUntilDue <= 0 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`}>
                       <CalendarClock size={16} strokeWidth={2} />
                   </div>
                 </>
               ) : (
                 <div className="flex flex-col items-center justify-center w-full h-full text-center space-y-1">
                      <div className="bg-emerald-500/10 p-2 rounded-full text-emerald-500 mb-1">
                         <CheckCircle size={18} />
                      </div>
                      <p className="text-[10px] font-medium text-zinc-400">Tudo pago por agora!</p>
                 </div>
               )}
             </div>

          </div>
          
          <div className="mt-1">
              <InsightBar text={miniInsight} />
          </div>

          <div className="card h-[440px] p-5">
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Rótulo corrigido para Últimos 12 meses */}
                <div><h3 className="text-base font-semibold text-white">Fluxo Financeiro</h3><p className="text-xs text-zinc-500">Últimos 12 meses</p></div>
                <div className="bg-zinc-900 border border-white/5 p-0.5 rounded-lg flex">
                    {[{ key: 'all', label: 'Tudo' }, { key: 'income', label: 'Receitas' }, { key: 'expense', label: 'Despesas' }].map((filter) => (
                        <button key={filter.key} onClick={() => setChartFilter(filter.key)} className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all duration-200 ${chartFilter === filter.key ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>{filter.label}</button>
                    ))}
                </div>
            </div>
            <div className="h-full w-full pb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chartData} margin={{ top: 5, right: 10, bottom: 30, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" /> 
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(value) => `${value/1000}k`} />
                        <Tooltip cursor={{ stroke: '#6366F1', strokeWidth: 1 }} contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', background: '#18181b', color: '#fff', fontSize: '12px' }} formatter={(value: number) => [formatCurrency(value), 'Valor'] as [string, string]} />
                        <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}/>
                        {(chartFilter === 'all' || chartFilter === 'expense') && (<Line type="monotone" dataKey="expense" name="Despesas" stroke={colors.red} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: colors.red }} />)}
                        {(chartFilter === 'all' || chartFilter === 'income') && (<Line type="monotone" dataKey="income" name="Receitas" stroke={colors.green} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: colors.green }} />)}
                    </LineChart>
                </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-5 h-[300px] flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-white">Origem das Receitas</h3>
                        <p className="text-xs text-zinc-500">Fontes de entrada</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{formatCurrency(data.totalIncome)}</span>
                  </div>
                  
                  {data.incomeSources.length > 0 ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                        {data.incomeSources.map((source, index) => (
                           <div key={index} className="group">
                              <div className="flex justify-between items-center mb-1 text-xs">
                                <span className="font-medium text-zinc-300 truncate max-w-[120px]" title={source.name}>{source.name}</span>
                                <span className="font-semibold text-white">{formatCurrency(source.value)}</span>
                              </div>
                              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500" 
                                    style={{ width: `${source.percent}%`, opacity: Math.max(0.4, source.percent/100) }} 
                                  />
                              </div>
                           </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-2">
                        <AlertCircle size={24} className="opacity-50"/>
                        <p className="text-xs">Nenhuma receita lançada.</p>
                    </div>
                  )}
              </div>
              
              <div className="card p-5 h-[300px] flex flex-col">
                  <div className="mb-3 shrink-0">
                      <h3 className="text-base font-semibold text-white">Ações Rápidas</h3>
                      <p className="text-xs text-zinc-500">Atalhos para o dia a dia</p>
                  </div>

                  <div className="flex flex-col gap-2.5 flex-1">
                      <button onClick={() => router.push('/expenses')} className="group w-full flex items-center gap-3.5 px-4 h-11 rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-800 hover:border-white/10 transition-all">
                          <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                              <TrendingDown size={18} strokeWidth={2}/>
                          </div>
                          <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Nova Despesa</span>
                      </button>

                      <button onClick={() => router.push('/incomes')} className="group w-full flex items-center gap-3.5 px-4 h-11 rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-800 hover:border-white/10 transition-all">
                          <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                              <TrendingUp size={18} strokeWidth={2}/>
                          </div>
                          <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Nova Receita</span>
                      </button>

                      <button onClick={() => router.push('/accounts')} className="group w-full flex items-center gap-3.5 px-4 h-11 rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-800 hover:border-white/10 transition-all">
                          <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                              <CreditCard size={18} strokeWidth={2}/>
                          </div>
                          <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Gerenciar Cartões</span>
                      </button>

                      <button onClick={() => router.push('/profile')} className="group w-full flex items-center gap-3.5 px-4 h-11 rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-800 hover:border-white/10 transition-all">
                          <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                              <User size={18} strokeWidth={2}/>
                          </div>
                          <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Meu Perfil</span>
                      </button>
                  </div>
              </div>
          </div>

          <div className="mt-1">
             <InsightBar text={incomeActionsInsight} />
          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="card rounded-2xl p-5">
            <div className="mb-6"><h3 className="text-base font-semibold text-white">Categorias</h3><p className="text-xs text-zinc-500">Top despesas do período</p></div>
            <div className="space-y-4">
              {data.topCategories.length > 0 ? (data.topCategories.map((cat, index) => (
                <div key={index} className="group">
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="font-medium text-zinc-300 truncate max-w-[150px]" title={cat.name}>{cat.name}</span>
                    <div className="text-right flex items-center gap-2"><span className="font-semibold text-white">{formatCurrency(cat.value)}</span><span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">{cat.percent.toFixed(0)}%</span></div>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${cat.percent}%`, backgroundColor: getMonochromeColor(index) }} /></div>
                </div>))) : ( <div className="flex h-[200px] items-center justify-center text-zinc-600 text-sm">Nenhuma despesa neste período.</div> )}
            </div>
          </div>
          
          <div className="card rounded-2xl p-5">
            <div className="mb-6 flex items-center justify-between">
              {/* Rótulo corrigido para Últimos 12 meses */}
              <div><h3 className="text-base font-semibold text-white">Evolução por Categoria</h3><p className="text-xs text-zinc-500">Últimos 12 meses</p></div>
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="text-xs border-white/10 rounded-lg py-1.5 px-3 bg-zinc-800 text-zinc-300 focus:ring-indigo-500 cursor-pointer hover:bg-zinc-700 outline-none">
                {data.accountNames.map(name => (<option key={name} value={name}>{name}</option>))}
              </select>
            </div>
            <div className="h-[250px] w-full relative">
              {isPending && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-indigo-500"></div>
                  </div>
              )}
              {specificChartData.length > 0 && selectedAccount ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={specificChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(value) => `${value}`} />
                    <Tooltip cursor={{ stroke: '#6366F1', strokeWidth: 1 }} contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', background: '#18181b', color: '#fff', fontSize: '12px' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, selectedAccount]} />
                    <Line type="monotone" dataKey="value" stroke={colors.indigo} strokeWidth={2} dot={{ r: 3, fill: colors.indigo, strokeWidth: 2, stroke: "#18181b" }} activeDot={{ r: 5, fill: "#6366F1" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : ( 
                <div className="flex h-full items-center justify-center text-zinc-600 text-sm">Selecione uma categoria.</div> 
              )}
            </div>
          </div>
      </div>

      <div className="card rounded-2xl relative overflow-hidden flex flex-col md:flex-row min-h-[450px] mt-6">
        {userProfile.plan === 'free' && <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-6"><div className="bg-zinc-800 p-3 rounded-full mb-3"><Lock className="text-yellow-400" size={20} /></div><h3 className="text-base font-bold text-white">Painel de Fatura Pro</h3><p className="text-xs text-zinc-400 mb-4 max-w-xs">Desbloqueie análises de projeção e insights.</p><button onClick={() => setShowUpgradeModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-lg shadow-indigo-900/20">Desbloquear Premium</button></div>}

        <div className="w-full md:w-[40%] bg-zinc-900/30 border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col relative justify-between">
           
           <div className="mb-4">
              <h3 className="text-base font-semibold text-white">
                 {selectedCcCategory ? `Foco: ${selectedCcCategory}` : 'Fatura Aberta'}
              </h3>
              <p className="text-xs text-zinc-500">
                {selectedCcCategory ? 'Evolução diária' : 'Análise de impacto'}
              </p>
           </div>
           
           {activeCreditLimit > 0 && !selectedCcCategory && (
             <div className="mt-2 bg-zinc-950/50 p-3 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2">
               <div className="flex justify-between items-end mb-2">
                 <div><span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Comprometido</span><span className="text-xs font-bold text-white flex items-center gap-1">{limitUsedPercent.toFixed(1)}% <CreditCard size={10} className="text-zinc-600"/></span></div>
                 <div className="text-right"><span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Disponível</span><span className={`text-xs font-bold ${limitAvailable < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(limitAvailable)}</span></div>
               </div>
               <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1.5"><div className={`h-full rounded-full transition-all duration-700 ease-out ${limitBarColor}`} style={{ width: `${Math.min(limitUsedPercent, 100)}%` }}></div></div>
               <div className="text-right"><span className="text-[9px] text-zinc-600">Total: {formatCurrency(activeCreditLimit)}</span></div>
             </div>
           )}

           <div className="w-full h-[180px] my-4">
             {selectedCcCategory ? (
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={categoryDailyEvolution} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs><linearGradient id="colorSplit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                    <Tooltip cursor={{stroke: '#ffffff20'}} contentStyle={{ borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#colorSplit)" strokeWidth={2} />
                    <XAxis dataKey="day" hide /><YAxis hide />
                  </AreaChart>
               </ResponsiveContainer>
             ) : (
               data.ccCategoryData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.ccCategoryData.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }} width={70} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: '#ffffff05'}} 
                        contentStyle={{ borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: '11px' }} 
                        itemStyle={{ color: '#e4e4e7' }}
                        formatter={(value: number) => [formatCurrency(value), 'Valor']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                        {data.ccCategoryData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={getCcBarColor(entry.value)} />
                        ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               ) : <div className="h-full flex items-center justify-center text-xs text-zinc-600">Sem dados.</div>
             )}
           </div>

           <div className="mt-auto">
              <InsightBar text={dynamicInsightText} />
           </div>
           
        </div>

        <div className="w-full md:w-[60%] p-6 flex flex-col h-full bg-zinc-900/10">
           <div className="flex justify-between items-center mb-4">
              <div><h3 className="text-base font-semibold text-white">Lançamentos da Fatura</h3><p className="text-xs text-zinc-500">Últimas movimentações</p></div>
              {selectedCcCategory && (
                <button onClick={() => setSelectedCcCategory(null)} className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-white bg-white/5 px-2 py-1 rounded transition-colors"><ArrowLeft size={10}/> VOLTAR</button>
              )}
           </div>
           <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {selectedCcCategory ? (
                 getGroupedTransactions(selectedCcCategory).length > 0 ? (
                   getGroupedTransactions(selectedCcCategory).map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400"><DollarSign size={14} /></div>
                          <div><p className="text-xs font-medium text-zinc-200">{t.description}</p><p className="text-[10px] text-zinc-500">{formatDate(t.created_at)}</p></div>
                       </div>
                       <span className="text-xs font-bold text-white">{formatCurrency(t.amount)}</span>
                    </div>
                   ))
                 ) : <div className="text-center text-zinc-600 py-10 text-xs">Nenhum lançamento encontrado.</div>
              ) : (
                 data.ccCategoryData.map((cat, i) => (
                    <div key={i} onClick={() => setSelectedCcCategory(cat.name)} className="group flex items-center justify-between p-3 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-indigo-500/30 cursor-pointer transition-all">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${i === 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400'}`}><CreditCard size={14} /></div>
                          <div><p className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors">{cat.name}</p><p className="text-[10px] text-zinc-500 group-hover:text-indigo-300 transition-colors">Ver detalhes</p></div>
                       </div>
                       <div className="text-right">
                          <span className="text-xs font-bold text-white block">{formatCurrency(cat.value)}</span>
                          <span className="text-[10px] text-zinc-500 group-hover:text-indigo-300 transition-colors flex items-center justify-end gap-1">Detalhes <ChevronRight size={8}/></span>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>

      {/* RODA PÉ */}
      <div className="mt-8 border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
                  <span className="font-bold text-xs">B</span>
              </div>
              <p className="text-xs text-zinc-500">© 2024 Meu Bleu. Financeiro Inteligente.</p>
          </div>

          <div className="flex items-center gap-6">
              <button className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">Termos de Uso</button>
              <button className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">Política de Privacidade</button>
              <button className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-1">
                  Suporte <ArrowUpRight size={10} />
              </button>
          </div>
      </div>
      
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}