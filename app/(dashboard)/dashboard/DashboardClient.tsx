'use client'

import { useRouter } from 'next/navigation'
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, Cell, AreaChart, Area, PieChart, Pie
} from 'recharts'
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  AlertTriangle, Lightbulb, Activity, Lock, 
  Zap, ChevronRight, ChevronDown, CreditCard,
  CalendarClock, AlertCircle, Target, CheckCircle, ArrowUpRight,
  User, Plus, ArrowRight 
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../../lib/utils'
import { useState, useEffect, useMemo, useTransition } from 'react'
import UpgradeModal from '../../../components/UpgradeModal'
import { getAccountYearlyData } from '../../actions/dashboard-data'

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

const colors = { red: '#f43f5e', green: '#10b981', yellow: '#f59e0b', indigo: '#6366f1', slate: '#3f3f46' }
const cardClassBase = "card relative flex flex-col justify-between overflow-hidden"
const iconBadgeClass = "absolute top-5 right-5 w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10"

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
  <div className="group flex items-start sm:items-center gap-3 bg-indigo-500/10 px-4 py-3 sm:py-2.5 rounded-xl border border-indigo-500/20 backdrop-blur-sm transition-colors hover:bg-indigo-500/15 mt-auto">
      <div className="relative shrink-0 mt-0.5 sm:mt-0">
          <Lightbulb size={16} className="text-indigo-400 group-hover:text-amber-300 transition-all duration-500" />
      </div>
      <p className="text-xs font-medium text-indigo-200 leading-relaxed sm:leading-snug">{text}</p>
  </div>
)

export default function DashboardClient({ data, userProfile, selectedMonth, selectedYear }: DashboardProps) {
  const router = useRouter()
  
  const [chartFilter, setChartFilter] = useState('all')
  const [selectedAccount, setSelectedAccount] = useState(data.accountNames[0] || '')
  const [specificChartData, setSpecificChartData] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const currentResult = data.totalIncome - data.currentMonthTotal
  const isSpendingMore = data.percentageChange > 0
  
  // Limites do Cartão Global
  const globalCcLimitPercent = data.totalCreditLimit > 0 ? (data.ccTotal / data.totalCreditLimit) * 100 : 0;
  
  // Organiza transações recentes pela data real
  const recentCcTransactions = useMemo(() => {
    return [...data.ccTransactions].sort((a, b) => {
        const dateA = new Date(a.created_at || a.date).getTime();
        const dateB = new Date(b.created_at || b.date).getTime();
        return dateB - dateA;
    });
  }, [data.ccTransactions])

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
  let dueColorClass = "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
  
  if (daysUntilDue !== null) {
      if (daysUntilDue < 0) { dueText = "Atrasado"; dueColorClass = "text-red-400 border-red-500/30 bg-red-500/10"; }
      else if (daysUntilDue === 0) { dueText = "Vence hoje"; dueColorClass = "text-amber-400 border-amber-500/30 bg-amber-500/10"; }
      else if (daysUntilDue === 1) { dueText = "Vence amanhã"; dueColorClass = "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"; }
      else { dueText = `Em ${daysUntilDue} dias`; dueColorClass = "text-zinc-400 border-white/10 bg-white/5"; }
  }

  const activeBudgets = useMemo(() => {
    return data.accountsList
        .filter(acc => acc.monthly_budget && acc.monthly_budget > 0)
        .map(acc => {
            const spend = data.allCategorySpends.find(c => c.name === acc.name)?.value || 0
            const percent = (spend / acc.monthly_budget) * 100
            const isOver = spend > acc.monthly_budget
            return { name: acc.name, budget: acc.monthly_budget, spend, percent, isOver, color: acc.color, is_card: acc.is_credit_card }
        })
        .sort((a, b) => b.percent - a.percent) 
  }, [data.accountsList, data.allCategorySpends])

  const expenseTypeData = [
    { name: 'Recorrentes', value: data.expenseTypeBreakdown.fixed },
    { name: 'Variáveis', value: data.expenseTypeBreakdown.variable },
  ].filter(d => d.value > 0)

  const COLORS_PIE = ['#6366f1', '#f43f5e']

  useEffect(() => {
    if (selectedAccount) {
      startTransition(async () => {
        const chartData = await getAccountYearlyData(selectedYear, selectedMonth, selectedAccount)
        setSpecificChartData(chartData)
      })
    }
  }, [selectedAccount, selectedYear, selectedMonth])

  function handleFilterChange(month: number, year: number) {
    router.push(`/dashboard?month=${month}&year=${year}`)
  }

  let scoreTextColor = 'text-red-400'
  if (data.healthScore >= 80) { scoreTextColor = 'text-indigo-400' }
  else if (data.healthScore >= 50) { scoreTextColor = 'text-amber-400' }

  const getMonochromeColor = (index: number) => {
    const opacities = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];
    return opacities[index % opacities.length];
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-full overflow-x-hidden pb-10">
      
      {/* =========================================================
          HEADER
      ========================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-14 md:pt-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
          <p className="text-zinc-400 text-sm mt-1">Bem-vindo(a) de volta, <strong className="text-zinc-200">{userProfile.name}</strong>.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center bg-zinc-900/80 border border-white/10 rounded-lg p-1.5 w-full sm:w-auto justify-between shadow-sm">
             <div className="relative flex-1 sm:flex-none">
                <select value={selectedMonth} onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} className="bg-transparent text-zinc-200 text-sm font-medium py-1.5 pl-3 pr-2 w-full cursor-pointer hover:text-white outline-none [&>option]:bg-zinc-900">
                  {monthNames.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
             </div>
             <span className="text-zinc-600 px-1">/</span>
             <div className="relative flex-1 sm:flex-none">
                <select value={selectedYear} onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} className="bg-transparent text-zinc-200 text-sm font-medium py-1.5 pl-2 pr-6 w-full cursor-pointer hover:text-white outline-none [&>option]:bg-zinc-900">
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
             </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          LINHA 1: HERO METRICS
      ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
         <div className={`${cardClassBase} h-auto min-h-[140px] p-6 bg-gradient-to-br from-zinc-900/80 to-zinc-900 shadow-lg border-white/5`}>
            <div className="space-y-1.5 w-[85%] relative z-10">
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Saldo do Mês</p>
               <h3 className={`text-3xl font-bold tracking-tight ${currentResult < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(currentResult)}</h3>
            </div>
            <div className={`${iconBadgeClass} ${currentResult < 0 ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}><Wallet size={20} strokeWidth={2} /></div>
            <div className="absolute -bottom-4 -right-4 opacity-10 blur-xl w-32 h-32 rounded-full pointer-events-none" style={{ backgroundColor: currentResult < 0 ? '#f43f5e' : '#10b981' }}></div>
         </div>

         <div className={`${cardClassBase} h-auto min-h-[140px] p-6`}>
            <div className="space-y-1.5 w-[85%]">
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Receitas</p>
               <h3 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(data.totalIncome)}</h3>
            </div>
            <div className={`${iconBadgeClass} text-emerald-400`}><TrendingUp size={20} strokeWidth={2} /></div>
         </div>

         <div className={`${cardClassBase} h-auto min-h-[140px] p-6`}>
            <div className="space-y-1.5 w-[85%]">
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Despesas</p>
               <h3 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(data.currentMonthTotal)}</h3>
            </div>
            <div className={`${iconBadgeClass} text-rose-400`}><TrendingDown size={20} strokeWidth={2} /></div>
         </div>

         <div className={`${cardClassBase} h-auto min-h-[140px] p-6`}>
           {data.nextDue ? (
             <div className="w-full h-full flex flex-col justify-between">
                 <div className="w-[85%]">
                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Próx. Vencimento</p>
                     <h3 className="text-sm font-semibold text-zinc-200 truncate" title={data.nextDue.name}>{data.nextDue.name}</h3>
                     <p className="text-xl font-bold text-white">{formatCurrency(data.nextDue.value)}</p>
                 </div>
                 <div className={`mt-2 w-fit text-[10px] font-bold px-2 py-1 rounded-md border ${dueColorClass}`}>
                    {dueText}
                 </div>
                 <div className={`${iconBadgeClass} text-indigo-400`}><CalendarClock size={20} strokeWidth={2} /></div>
             </div>
           ) : (
             <div className="w-full h-full flex flex-col justify-center items-center text-center">
                 <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-500 mb-2">
                    <CheckCircle size={24} />
                 </div>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tudo em Dia</p>
             </div>
           )}
         </div>
      </div>

      {/* =========================================================
          LINHA 2: FLUXO DE CAIXA + ORIGEM DAS RECEITAS
      ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico do Fluxo Financeiro (Col-Span-2) */}
        <div className="lg:col-span-2 card p-5 sm:p-6 flex flex-col min-h-[350px]">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                 <h3 className="text-base font-semibold text-white">Fluxo de Caixa Mensal</h3>
                 <p className="text-xs text-zinc-500">Histórico de entradas e saídas</p>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-1 rounded-lg flex w-full sm:w-auto justify-between shadow-inner">
                  {[{ key: 'all', label: 'Tudo' }, { key: 'income', label: 'Receitas' }, { key: 'expense', label: 'Despesas' }].map((filter) => (
                      <button key={filter.key} onClick={() => setChartFilter(filter.key)} className={`flex-1 sm:flex-none text-center px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${chartFilter === filter.key ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>{filter.label}</button>
                  ))}
              </div>
          </div>
          
          <div className="flex-1 w-full h-[250px] md:h-full pb-2">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors.green} stopOpacity={0.2}/><stop offset="95%" stopColor={colors.green} stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors.red} stopOpacity={0.2}/><stop offset="95%" stopColor={colors.red} stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" /> 
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} minTickGap={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(value) => `${value/1000}k`} />
                      <Tooltip cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: '1px solid #3f3f46', background: 'rgba(24, 24, 27, 0.95)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: '12px', padding: '12px' }} formatter={(value: number) => [formatCurrency(value), 'Valor'] as [string, string]} />
                      <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingBottom: '20px' }}/>
                      {(chartFilter === 'all' || chartFilter === 'expense') && (<Area type="monotone" dataKey="expense" name="Despesas" stroke={colors.red} strokeWidth={3} fill="url(#colorExp)" activeDot={{ r: 5, fill: colors.red, stroke: '#18181b', strokeWidth: 2 }} />)}
                      {(chartFilter === 'all' || chartFilter === 'income') && (<Area type="monotone" dataKey="income" name="Receitas" stroke={colors.green} strokeWidth={3} fill="url(#colorInc)" activeDot={{ r: 5, fill: colors.green, stroke: '#18181b', strokeWidth: 2 }} />)}
                  </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* Origem de Receitas (Col-Span-1) */}
        <div className="card p-5 sm:p-6 flex flex-col h-[350px]">
            <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Origem das Receitas</h3>
                  <p className="text-xs text-zinc-500">Principais entradas</p>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-400/20">{formatCurrency(data.totalIncome)}</span>
            </div>
            
            {data.incomeSources.length > 0 ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                  {data.incomeSources.map((source, index) => (
                     <div key={index} className="group flex flex-col gap-1.5">
                        <div className="flex justify-between items-end text-sm">
                          <span className="font-medium text-zinc-300 truncate max-w-[65%]" title={source.name}>{source.name}</span>
                          <span className="font-bold text-white">{formatCurrency(source.value)}</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out" 
                              style={{ width: `${source.percent}%`, opacity: Math.max(0.5, source.percent/100) }} 
                            />
                        </div>
                     </div>
                  ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3 py-6">
                  <AlertCircle size={28} className="opacity-50"/>
                  <p className="text-xs">Nenhuma receita lançada.</p>
              </div>
            )}
        </div>
      </div>

      {/* =========================================================
          LINHA 3: EVOLUÇÃO DE CONTAS + PERFIL DO MÊS
      ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Evolução de Contas (Col-Span-2) */}
        <div className="lg:col-span-2 card p-5 sm:p-6 flex flex-col min-h-[350px]">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
               <h3 className="text-base font-semibold text-white">Evolução de Contas</h3>
               <p className="text-xs text-zinc-500">Comportamento individual (12 meses)</p>
            </div>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="w-full sm:w-auto text-sm font-medium border border-white/10 rounded-lg py-1.5 px-3 bg-zinc-900 text-zinc-200 focus:ring-1 focus:ring-indigo-500 cursor-pointer hover:bg-zinc-800 outline-none transition-colors">
              {data.accountNames.map(name => (<option key={name} value={name}>{name}</option>))}
            </select>
          </div>
          <div className="flex-1 w-full h-[250px] md:h-full relative">
            {isPending && (
                <div className="absolute inset-0 bg-[#18181b]/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            )}
            {specificChartData.length > 0 && selectedAccount ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={specificChartData} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} minTickGap={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(value) => `${value}`} />
                  <Tooltip cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: '1px solid #3f3f46', background: 'rgba(24, 24, 27, 0.95)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: '12px', padding: '12px' }} formatter={(value: number) => [formatCurrency(value), selectedAccount]} />
                  <Line type="monotone" dataKey="value" stroke={colors.indigo} strokeWidth={3} dot={{ r: 4, fill: colors.indigo, strokeWidth: 2, stroke: "#18181b" }} activeDot={{ r: 6, fill: "#818cf8", stroke: '#18181b' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : ( 
              <div className="flex h-full items-center justify-center text-zinc-600 text-sm">Selecione uma conta com histórico.</div> 
            )}
          </div>
        </div>

        {/* Perfil de Despesas (Col-Span-1) */}
        <div className="card p-5 sm:p-6 flex flex-col h-[350px]">
            <div className="mb-2 shrink-0">
              <h3 className="text-base font-semibold text-white">Perfil do Mês</h3>
              <p className="text-xs text-zinc-500">Recorrentes vs Variáveis</p>
            </div>
            
            {expenseTypeData.length > 0 ? (
                <div className="flex flex-col flex-1 gap-4 items-center justify-center w-full mt-4">
                    <div className="w-full h-[150px] relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={expenseTypeData} cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" paddingAngle={5} dataKey="value" stroke='none'>
                                    {expenseTypeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />))}
                                </Pie>
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: '12px', padding: '8px 12px' }} formatter={(value: number, name: string) => [formatCurrency(value), name] as [string, string]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <div className="text-center">
                               <span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Total</span>
                               <span className="text-sm font-bold text-zinc-200">{formatCurrency(data.currentMonthTotal)}</span>
                           </div>
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-3 mt-2">
                        {data.expenseTypeBreakdown.fixed > 0 && (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                              <div className="flex items-center gap-2.5">
                                 <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                                 <span className="text-xs font-bold text-zinc-300 uppercase">Fixo</span>
                              </div>
                              <span className="text-sm font-bold text-white">{formatCurrency(data.expenseTypeBreakdown.fixed)}</span>
                          </div>
                        )}
                        {data.expenseTypeBreakdown.variable > 0 && (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                              <div className="flex items-center gap-2.5">
                                 <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                                 <span className="text-xs font-bold text-zinc-300 uppercase">Variável</span>
                              </div>
                              <span className="text-sm font-bold text-white">{formatCurrency(data.expenseTypeBreakdown.variable)}</span>
                          </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3 py-10">
                    <AlertCircle size={32} className="opacity-50"/>
                    <p className="text-xs text-center">Classifique contas para ver o perfil.</p>
                </div>
            )}
        </div>
      </div>

      {/* =========================================================
          LINHA 4: RAIO-X (Metas, Categorias, Operações)
      ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Top Categorias */}
        <div className="card p-5 sm:p-6 flex flex-col h-[340px]">
          <div className="mb-4 shrink-0 flex items-center justify-between">
             <div>
               <h3 className="text-base font-semibold text-white">Top Categorias</h3>
               <p className="text-xs text-zinc-500">Onde gastou mais</p>
             </div>
             <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400"><TrendingDown size={16}/></div>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar pr-2 space-y-3 flex-1">
            {data.topCategories.length > 0 ? (data.topCategories.map((cat, index) => (
              <div key={index} className="group flex flex-col gap-1.5">
                <div className="flex justify-between items-end text-sm">
                  <span className="font-medium text-zinc-300 text-xs truncate max-w-[60%]" title={cat.name}>{cat.name}</span>
                  <div className="text-right flex items-center gap-2">
                     <span className="font-bold text-white text-xs">{formatCurrency(cat.value)}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                   <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.percent}%`, backgroundColor: getMonochromeColor(index) }} />
                </div>
              </div>))) : ( <div className="flex flex-1 items-center justify-center text-zinc-600 text-xs">Nenhum gasto registado.</div> )}
          </div>
        </div>

        {/* Painel de Metas */}
        <div className="card p-5 sm:p-6 flex flex-col relative overflow-hidden h-[340px]">
           {userProfile.plan === 'free' && (
              <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-6">
                 <div className="bg-zinc-800 p-3 rounded-full mb-3"><Lock className="text-amber-400" size={20} /></div>
                 <h3 className="text-base font-bold text-white">Metas Pro</h3>
                 <p className="text-xs text-zinc-400 mb-4">Acompanhe orçamentos visuais.</p>
                 <button onClick={() => setShowUpgradeModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-xs font-bold transition-all shadow-lg">Desbloquear Premium</button>
              </div>
           )}

           <div className="mb-4 shrink-0 flex items-center justify-between">
               <div>
                 <h3 className="text-base font-semibold text-white">Metas do Mês</h3>
                 <p className="text-xs text-zinc-500">Orçamento vs Realizado</p>
               </div>
               <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Target size={16}/></div>
           </div>

           {activeBudgets.length > 0 ? (
              <div className="overflow-y-auto custom-scrollbar pr-2 space-y-3 flex-1">
                 {activeBudgets.map((item, idx) => (
                     <div key={idx} className="space-y-1.5">
                         <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                               <span className="text-xs font-bold text-zinc-200">{item.name}</span>
                            </div>
                            <span className={`text-xs font-bold ${item.isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                               {formatCurrency(item.spend)} <span className="text-zinc-500 text-[10px] font-medium">/ {formatCurrency(item.budget)}</span>
                            </span>
                         </div>
                         <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(item.percent, 100)}%`, backgroundColor: item.isOver ? '#f43f5e' : item.color }} />
                         </div>
                     </div>
                 ))}
              </div>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3">
                 <Target size={28} className="opacity-30" />
                 <p className="text-[10px] text-center">Configure limites nas suas contas.</p>
              </div>
           )}
        </div>

        {/* Ações Rápidas */}
        <div className="card p-5 sm:p-6 flex flex-col h-[340px]">
            <div className="mb-4 shrink-0">
                <h3 className="text-base font-semibold text-white">Operações</h3>
                <p className="text-xs text-zinc-500">Atalhos rápidos</p>
            </div>

            <div className="flex flex-col gap-3 flex-1 justify-center">
                <button onClick={() => router.push('/expenses')} className="group w-full flex items-center justify-between px-4 h-12 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="text-rose-400"><TrendingDown size={16} strokeWidth={2.5}/></div>
                      <span className="text-sm font-semibold text-zinc-300 group-hover:text-white">Lançar Despesa</span>
                    </div>
                    <Plus size={14} className="text-zinc-600 group-hover:text-white"/>
                </button>

                <button onClick={() => router.push('/incomes')} className="group w-full flex items-center justify-between px-4 h-12 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="text-emerald-400"><TrendingUp size={16} strokeWidth={2.5}/></div>
                      <span className="text-sm font-semibold text-zinc-300 group-hover:text-white">Lançar Receita</span>
                    </div>
                    <Plus size={14} className="text-zinc-600 group-hover:text-white"/>
                </button>

                <button onClick={() => router.push('/cards')} className="group w-full flex items-center justify-between px-4 h-12 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="text-indigo-400"><CreditCard size={16} strokeWidth={2.5}/></div>
                      <span className="text-sm font-semibold text-zinc-300 group-hover:text-white">Meus Cartões</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600 group-hover:text-white"/>
                </button>
            </div>
            
            <div className="mt-4">
               <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                     <Activity size={14} className={scoreTextColor}/>
                     <span className="text-xs font-bold text-zinc-300">Score de Saúde</span>
                  </div>
                  <span className={`text-sm font-bold ${scoreTextColor}`}>{data.healthScore}/100</span>
               </div>
            </div>
        </div>

      </div>

      {/* =========================================================
          LINHA 5: A REVOLUÇÃO DO CARTÃO DE CRÉDITO (Fatura Aberta)
      ========================================================= */}
      <div className="card rounded-[2rem] relative overflow-hidden flex flex-col md:flex-row h-auto min-h-[400px] mt-2 shadow-xl p-0 border-white/5">
        {userProfile.plan === 'free' && <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-6"><div className="bg-zinc-800 p-4 rounded-full mb-4"><Lock className="text-amber-400" size={24} /></div><h3 className="text-lg font-bold text-white mb-1">Painel de Fatura Pro</h3><p className="text-sm text-zinc-400 mb-6 max-w-sm">Desbloqueie a visão consolidada de faturas e limite de crédito em tempo real.</p><button onClick={() => setShowUpgradeModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]">Desbloquear Premium</button></div>}

        {/* Lado Esquerdo - O Cartão Virtual Consolidado */}
        <div className="w-full md:w-[45%] lg:w-[40%] bg-zinc-900/50 md:border-r border-white/5 p-6 sm:p-8 flex flex-col justify-center items-center relative overflow-hidden">
           
           {/* Efeitos de Luz no fundo */}
           <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[80px]"></div>
              <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[80px]"></div>
           </div>

           <div className="w-full max-w-[340px] z-10">
               <div className="mb-6">
                  <h3 className="text-lg font-bold text-white tracking-tight">Faturas de Cartão</h3>
                  <p className="text-xs text-zinc-400 mt-1">Visão consolidada de todas as contas</p>
               </div>

               {/* Cartão Glassmorphism */}
               <div className="aspect-[1.58/1] w-full rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/90 border border-white/10 p-5 sm:p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                  {/* Brilho hover */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start">
                     <div className="w-10 h-7 rounded bg-gradient-to-br from-amber-200/80 to-amber-400/60 opacity-80"></div>
                     <div className="text-white/40"><Zap size={20} className="rotate-90"/></div>
                  </div>

                  <div className="space-y-1">
                     <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Total Gasto (Faturas)</p>
                     <h2 className="text-3xl font-bold text-white tracking-tight">{formatCurrency(data.ccTotal)}</h2>
                  </div>

                  <div className="flex justify-between items-end">
                     <div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-0.5">Limite Disponível</p>
                        <p className="text-xs font-bold text-zinc-300">{formatCurrency(Math.max(0, data.totalCreditLimit - data.ccTotal))}</p>
                     </div>
                     <div className="flex gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-red-500/60 mix-blend-screen"></div>
                        <div className="w-6 h-6 rounded-full bg-amber-500/60 mix-blend-screen -ml-3"></div>
                     </div>
                  </div>
               </div>

               {/* Barra de Progresso do Limite Global */}
               <div className="mt-6 space-y-2">
                   <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-zinc-400">Uso do Limite Global</span>
                      <span className="font-bold text-white">{globalCcLimitPercent.toFixed(1)}%</span>
                   </div>
                   <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, globalCcLimitPercent)}%` }}></div>
                   </div>
               </div>
           </div>
        </div>

        {/* Lado Direito - Últimas Compras em vez de gráfico esquisito */}
        <div className="w-full md:w-[55%] lg:w-[60%] p-6 sm:p-8 flex flex-col h-auto">
           <div className="flex justify-between items-center mb-6 shrink-0 border-b border-white/5 pb-4">
              <div>
                 <h3 className="text-base font-semibold text-white">Últimas Compras</h3>
                 <p className="text-xs text-zinc-500">Recentes no crédito</p>
              </div>
              <button onClick={() => router.push('/cards')} className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-400/10 px-3 py-1.5 rounded-lg">
                 Ver Cartões <ArrowRight size={14}/>
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar max-h-[300px]">
              {recentCcTransactions.length > 0 ? (
                 recentCcTransactions.slice(0, 7).map((t, i) => (
                    <div key={i} className="group flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/50 transition-all border border-transparent hover:border-white/5">
                       <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800/80 text-zinc-400 border border-white/5 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                             <CreditCard size={18} strokeWidth={2.5} />
                          </div>
                          <div>
                             <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">{t.description || t.name}</p>
                             <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{t.category} • {formatDate(t.created_at || t.date)}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <span className="text-sm font-bold text-white block">{formatCurrency(t.amount || t.value)}</span>
                       </div>
                    </div>
                 ))
              ) : (
                 <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3 py-10">
                    <CreditCard size={32} className="opacity-20"/>
                    <p className="text-xs">Nenhuma transação recente encontrada.</p>
                 </div>
              )}
           </div>
        </div>
      </div>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}