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
  CalendarClock, AlertCircle, Target, CheckCircle, Plus, ArrowRight 
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
  data: any
  userProfile: { name: string, plan: string }
  selectedMonth: number
  selectedYear: number
}

export default function DashboardClient({ data, userProfile, selectedMonth, selectedYear }: DashboardProps) {
  const router = useRouter()
  
  const [chartFilter, setChartFilter] = useState('all')
  const [selectedAccount, setSelectedAccount] = useState(data.accountNames?.[0] || '')
  const [specificChartData, setSpecificChartData] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const currentResult = data.totalIncome - data.currentMonthTotal
  const globalCcLimitPercent = data.totalCreditLimit > 0 ? (data.ccTotal / data.totalCreditLimit) * 100 : 0;
  
  const recentCcTransactions = useMemo(() => {
    return [...(data.ccTransactions || [])].sort((a, b) => {
        return new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime();
    });
  }, [data.ccTransactions])

  const daysUntilDue = useMemo(() => {
    if (!data.nextDue) return null
    const today = new Date(); today.setHours(0,0,0,0)
    const dueDate = new Date(data.nextDue.date); dueDate.setHours(0,0,0,0)
    return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1 
  }, [data.nextDue])

  let dueText = "", dueColorClass = "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
  if (daysUntilDue !== null) {
      if (daysUntilDue < 0) { dueText = "Atrasado"; dueColorClass = "text-red-400 border-red-500/30 bg-red-500/10"; }
      else if (daysUntilDue === 0) { dueText = "Vence hoje"; dueColorClass = "text-amber-400 border-amber-500/30 bg-amber-500/10"; }
      else if (daysUntilDue === 1) { dueText = "Vence amanhã"; dueColorClass = "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"; }
      else { dueText = `Em ${daysUntilDue} dias`; dueColorClass = "text-zinc-400 border-white/10 bg-white/5"; }
  }

  const activeBudgets = useMemo(() => {
    return (data.accountsList || [])
        .filter((acc: any) => acc.monthly_budget > 0)
        .map((acc: any) => {
            const spend = data.allCategorySpends?.find((c: any) => c.name === acc.name)?.value || 0
            const percent = (spend / acc.monthly_budget) * 100
            return { name: acc.name, budget: acc.monthly_budget, spend, percent, isOver: spend > acc.monthly_budget, color: acc.color }
        })
        .filter((item: any) => item.spend > 0) 
        .sort((a: any, b: any) => b.percent - a.percent) 
  }, [data.accountsList, data.allCategorySpends])

  const expenseTypeData = [
    { name: 'Recorrentes', value: data.expenseTypeBreakdown?.fixed || 0 },
    { name: 'Variáveis', value: data.expenseTypeBreakdown?.variable || 0 },
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

  function handleFilterChange(month: number, year: number) { router.push(`/dashboard?month=${month}&year=${year}`) }

  let scoreTextColor = 'text-red-400'
  if (data.healthScore >= 80) scoreTextColor = 'text-indigo-400'
  else if (data.healthScore >= 50) scoreTextColor = 'text-amber-400'

  return (
    <div className="w-full flex-1 space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-0">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-14 md:pt-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
          <p className="text-zinc-400 text-sm mt-1">Bem-vindo(a) de volta, <strong className="text-zinc-200">{userProfile.name}</strong>.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center bg-zinc-900/80 border border-white/10 rounded-lg p-1.5 w-full sm:w-auto shadow-sm">
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

      {/* LINHA 1: 4 KPIs LADO A LADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
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
                 <div className={`mt-2 w-fit text-[10px] font-bold px-2 py-1 rounded-md border ${dueColorClass}`}>{dueText}</div>
                 <div className={`${iconBadgeClass} text-indigo-400`}><CalendarClock size={20} strokeWidth={2} /></div>
             </div>
           ) : (
             <div className="w-full h-full flex flex-col justify-center items-center text-center">
                 <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-500 mb-2"><CheckCircle size={24} /></div>
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tudo em Dia</p>
             </div>
           )}
         </div>
      </div>

      {/* LINHA 2: FLUXO (Ocupa Metade) + PERFIL + ORIGEM (Grelha Densa 12 Colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        <div className="lg:col-span-12 xl:col-span-6 card p-5 sm:p-6 flex flex-col min-h-[350px]">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                 <h3 className="text-base font-semibold text-white">Fluxo de Caixa Mensal</h3>
                 <p className="text-xs text-zinc-500">Entradas vs Saídas</p>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-1 rounded-lg flex w-full sm:w-auto justify-between">
                  {[{ key: 'all', label: 'Tudo' }, { key: 'income', label: 'Receitas' }, { key: 'expense', label: 'Despesas' }].map((filter) => (
                      <button key={filter.key} onClick={() => setChartFilter(filter.key)} className={`flex-1 sm:flex-none text-center px-4 py-1 text-xs font-semibold rounded-md transition-all ${chartFilter === filter.key ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-500 hover:text-white'}`}>{filter.label}</button>
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
                      <Tooltip cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: '1px solid #3f3f46', background: '#18181b', color: '#fff', fontSize: '12px' }} formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                      {(chartFilter === 'all' || chartFilter === 'expense') && (<Area type="monotone" dataKey="expense" name="Despesas" stroke={colors.red} strokeWidth={3} fill="url(#colorExp)" />)}
                      {(chartFilter === 'all' || chartFilter === 'income') && (<Area type="monotone" dataKey="income" name="Receitas" stroke={colors.green} strokeWidth={3} fill="url(#colorInc)" />)}
                  </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 xl:col-span-3 card p-5 sm:p-6 flex flex-col h-[350px]">
            <div className="mb-2 shrink-0">
              <h3 className="text-base font-semibold text-white">Perfil do Mês</h3>
              <p className="text-xs text-zinc-500">Recorrentes vs Variáveis</p>
            </div>
            {expenseTypeData.length > 0 ? (
                <div className="flex flex-col flex-1 gap-2 items-center justify-center mt-2">
                    <div className="w-full h-[140px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={expenseTypeData} cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" paddingAngle={5} dataKey="value" stroke='none'>
                                    {expenseTypeData.map((e, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total</span>
                           <span className="text-xs font-bold text-zinc-200">{formatCurrency(data.currentMonthTotal)}</span>
                        </div>
                    </div>
                    <div className="w-full space-y-2 mt-2">
                        {data.expenseTypeBreakdown?.fixed > 0 && (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                              <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span><span className="text-[11px] font-bold text-zinc-300 uppercase">Fixo</span></div>
                              <span className="text-xs font-bold text-white">{formatCurrency(data.expenseTypeBreakdown.fixed)}</span>
                          </div>
                        )}
                        {data.expenseTypeBreakdown?.variable > 0 && (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10">
                              <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span className="text-[11px] font-bold text-zinc-300 uppercase">Variável</span></div>
                              <span className="text-xs font-bold text-white">{formatCurrency(data.expenseTypeBreakdown.variable)}</span>
                          </div>
                        )}
                    </div>
                </div>
            ) : ( <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3 py-10"><AlertCircle size={28} className="opacity-50"/><p className="text-[10px] text-center">Sem dados suficientes.</p></div> )}
        </div>

        <div className="lg:col-span-6 xl:col-span-3 card p-5 sm:p-6 flex flex-col h-[350px]">
            <div className="flex items-center justify-between mb-4">
                <div><h3 className="text-base font-semibold text-white">Origem Receitas</h3><p className="text-xs text-zinc-500">Principais entradas</p></div>
            </div>
            {data.incomeSources?.length > 0 ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                  {data.incomeSources.map((source: any, i: number) => (
                     <div key={i} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-end text-sm">
                          <span className="font-medium text-zinc-300 truncate max-w-[60%]">{source.name}</span>
                          <span className="font-bold text-white text-xs">{formatCurrency(source.value)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${source.percent}%`, opacity: Math.max(0.5, source.percent/100) }} /></div>
                     </div>
                  ))}
              </div>
            ) : ( <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3"><AlertCircle size={24} className="opacity-50"/><p className="text-[10px]">Nenhuma receita lançada.</p></div> )}
        </div>
      </div>

      {/* LINHA 3: CATEGORIAS + METAS + EVOLUÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        <div className="lg:col-span-6 xl:col-span-3 card p-5 sm:p-6 flex flex-col h-[350px]">
          <div className="mb-4 shrink-0 flex items-center justify-between">
             <div><h3 className="text-base font-semibold text-white">Top Categorias</h3><p className="text-xs text-zinc-500">Onde gastou mais</p></div>
             <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400"><TrendingDown size={14}/></div>
          </div>
          <div className="overflow-y-auto custom-scrollbar pr-2 space-y-3 flex-1">
            {data.topCategories?.length > 0 ? (data.topCategories.map((cat: any, i: number) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end text-sm"><span className="font-medium text-zinc-300 text-xs truncate max-w-[60%]">{cat.name}</span><span className="font-bold text-white text-xs">{formatCurrency(cat.value)}</span></div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${cat.percent}%`, opacity: Math.max(0.4, 1 - (i*0.15)) }} /></div>
              </div>))) : ( <div className="flex flex-1 items-center justify-center text-zinc-600 text-[10px]">Sem gastos registados.</div> )}
          </div>
        </div>

        <div className="lg:col-span-6 xl:col-span-3 card p-5 sm:p-6 flex flex-col relative overflow-hidden h-[350px]">
           {userProfile.plan === 'free' && (
              <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-6">
                 <div className="bg-zinc-800 p-3 rounded-full mb-3"><Lock className="text-amber-400" size={20} /></div>
                 <h3 className="text-base font-bold text-white">Metas Pro</h3>
                 <p className="text-xs text-zinc-400 mb-4">Acompanhe orçamentos.</p>
                 <button onClick={() => setShowUpgradeModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-xs font-bold transition-all shadow-lg">Desbloquear Premium</button>
              </div>
           )}
           <div className="mb-4 shrink-0 flex items-center justify-between">
               <div><h3 className="text-base font-semibold text-white">Metas do Mês</h3><p className="text-xs text-zinc-500">Orçamento vs Realizado</p></div>
               <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Target size={14}/></div>
           </div>
           {activeBudgets.length > 0 ? (
              <div className="overflow-y-auto custom-scrollbar pr-2 space-y-3 flex-1">
                 {activeBudgets.map((item: any, idx: number) => (
                     <div key={idx} className="space-y-1.5">
                         <div className="flex justify-between items-end"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div><span className="text-xs font-bold text-zinc-200 truncate">{item.name}</span></div><span className={`text-xs font-bold ${item.isOver ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(item.spend)}</span></div>
                         <div className="h-1.5 w-full bg-zinc-800 rounded-full"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(item.percent, 100)}%`, backgroundColor: item.isOver ? '#f43f5e' : item.color }} /></div>
                     </div>
                 ))}
              </div>
           ) : ( <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3"><Target size={24} className="opacity-30" /><p className="text-[10px] text-center">Nenhum orçamento movimentado.</p></div> )}
        </div>

        <div className="lg:col-span-12 xl:col-span-6 card p-5 sm:p-6 flex flex-col min-h-[350px]">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div><h3 className="text-base font-semibold text-white">Evolução de Contas</h3><p className="text-xs text-zinc-500">Comportamento individual (12 meses)</p></div>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="w-full sm:w-auto text-sm font-medium border border-white/10 rounded-lg py-1.5 px-3 bg-zinc-900 text-zinc-200 outline-none">
              {(data.accountNames || []).map((name: string) => (<option key={name} value={name}>{name}</option>))}
            </select>
          </div>
          <div className="flex-1 w-full h-[250px] md:h-full relative">
            {isPending && <div className="absolute inset-0 bg-[#18181b]/50 z-10 flex items-center justify-center rounded-lg"><div className="animate-spin rounded-full h-6 w-6 border-y-2 border-indigo-500"></div></div>}
            {specificChartData.length > 0 && selectedAccount ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={specificChartData} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} minTickGap={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => `${v}`} />
                  <Tooltip cursor={{ stroke: '#6366F1' }} contentStyle={{ borderRadius: '12px', border: '1px solid #3f3f46', background: '#18181b', color: '#fff', fontSize: '12px' }} formatter={(v: number) => [formatCurrency(v), selectedAccount]} />
                  <Line type="monotone" dataKey="value" stroke={colors.indigo} strokeWidth={3} dot={{ r: 4, fill: colors.indigo, strokeWidth: 2, stroke: "#18181b" }} activeDot={{ r: 6, fill: "#818cf8" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : ( <div className="flex h-full items-center justify-center text-zinc-600 text-sm">Selecione uma conta.</div> )}
          </div>
        </div>

      </div>

      {/* LINHA 4: CARTÃO VIRTUAL E COMPRAS (Cartão Unificado) + OPERAÇÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mt-2">
          
          {/* Cartão Combinado (9 Colunas) */}
          <div className="lg:col-span-12 xl:col-span-9 card rounded-[2rem] p-0 flex flex-col md:flex-row relative overflow-hidden bg-[#18181b] shadow-xl border-white/5 min-h-[400px]">
             
             {userProfile.plan === 'free' && (
                <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-6 rounded-[2rem]">
                   <Lock className="text-amber-400 mb-2" size={24}/>
                   <h3 className="font-bold text-white mb-4">Painel Fatura Pro</h3>
                   <button onClick={() => setShowUpgradeModal(true)} className="bg-indigo-600 text-white px-6 py-2 rounded-full text-sm font-bold">Desbloquear Premium</button>
                </div>
             )}

             {/* Lado Esquerdo: Resumo do Cartão Virtual */}
             <div className="w-full md:w-[45%] lg:w-[40%] bg-zinc-900/30 md:border-r border-white/5 p-6 sm:p-8 flex flex-col justify-center items-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[80px]"></div>
                    <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[80px]"></div>
                 </div>
                 <div className="w-full max-w-[340px] z-10">
                     <div className="mb-6"><h3 className="text-lg font-bold text-white tracking-tight">Faturas de Cartão</h3><p className="text-xs text-zinc-400 mt-1">Visão consolidada</p></div>
                     <div className="aspect-[1.58/1] w-full rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/90 border border-white/10 p-5 flex flex-col justify-between shadow-2xl relative">
                        <div className="flex justify-between items-start"><div className="w-10 h-7 rounded bg-gradient-to-br from-amber-200/80 to-amber-400/60 opacity-80"></div><Zap size={20} className="text-white/40 rotate-90"/></div>
                        <div className="space-y-1"><p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Total Gasto</p><h2 className="text-3xl font-bold text-white tracking-tight">{formatCurrency(data.ccTotal)}</h2></div>
                     </div>
                     <div className="mt-6 space-y-2">
                         <div className="flex justify-between text-xs"><span className="font-medium text-zinc-400">Uso Global</span><span className="font-bold text-white">{globalCcLimitPercent.toFixed(1)}%</span></div>
                         <div className="h-1.5 w-full bg-zinc-800 rounded-full"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, globalCcLimitPercent)}%` }}></div></div>
                     </div>
                 </div>
             </div>

             {/* Lado Direito: Últimas Compras (Max 5 visíveis com scroll) */}
             <div className="w-full md:w-[55%] lg:w-[60%] p-6 sm:p-8 flex flex-col h-full bg-zinc-900/10">
                 <div className="flex justify-between items-center mb-6 shrink-0 border-b border-white/5 pb-4">
                    <div><h3 className="text-base font-semibold text-white">Últimas Compras</h3><p className="text-xs text-zinc-500">Recentes no crédito</p></div>
                    <button onClick={() => router.push('/cards')} className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 bg-indigo-400/10 px-3 py-1.5 rounded-lg hover:bg-indigo-400/20 transition-colors">Ver Cartões <ArrowRight size={14}/></button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar" style={{ maxHeight: '320px' }}>
                    {recentCcTransactions.length > 0 ? recentCcTransactions.slice(0, 30).map((t: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/50 border border-transparent transition-colors">
                           <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-full bg-zinc-800/80 text-zinc-400 flex items-center justify-center border border-white/5"><CreditCard size={16} /></div>
                              <div><p className="text-sm font-semibold text-zinc-200">{t.description || t.name}</p><p className="text-[10px] text-zinc-500">{t.category}</p></div>
                           </div>
                           <span className="text-sm font-bold text-white block">{formatCurrency(t.amount || t.value)}</span>
                        </div>
                    )) : <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3"><CreditCard size={32} className="opacity-20"/><p className="text-xs">Sem transações.</p></div>}
                 </div>
             </div>
          </div>

          {/* Operações (3 Colunas) */}
          <div className="lg:col-span-12 xl:col-span-3 card p-5 flex flex-col h-[400px] w-full">
              <div className="mb-4 shrink-0"><h3 className="text-base font-semibold text-white">Operações</h3><p className="text-xs text-zinc-500">Atalhos rápidos</p></div>
              <div className="flex flex-col gap-3 flex-1 justify-center">
                  <button onClick={() => router.push('/expenses')} className="w-full flex items-center justify-between px-4 h-12 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-all text-sm font-semibold text-zinc-300 hover:text-white"><div className="flex items-center gap-3"><TrendingDown size={16} className="text-rose-400"/> Lançar Despesa</div><Plus size={14} className="text-zinc-600"/></button>
                  <button onClick={() => router.push('/incomes')} className="w-full flex items-center justify-between px-4 h-12 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-all text-sm font-semibold text-zinc-300 hover:text-white"><div className="flex items-center gap-3"><TrendingUp size={16} className="text-emerald-400"/> Lançar Receita</div><Plus size={14} className="text-zinc-600"/></button>
                  <button onClick={() => router.push('/cards')} className="w-full flex items-center justify-between px-4 h-12 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-all text-sm font-semibold text-zinc-300 hover:text-white"><div className="flex items-center gap-3"><CreditCard size={16} className="text-indigo-400"/> Meus Cartões</div><ChevronRight size={14} className="text-zinc-600"/></button>
              </div>
              <div className="mt-4 flex items-center justify-between bg-zinc-900 p-3 rounded-lg border border-white/5"><div className="flex items-center gap-2"><Activity size={14} className={scoreTextColor}/><span className="text-xs font-bold text-zinc-300">Score de Saúde</span></div><span className={`text-sm font-bold ${scoreTextColor}`}>{data.healthScore}/100</span></div>
          </div>

      </div>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}