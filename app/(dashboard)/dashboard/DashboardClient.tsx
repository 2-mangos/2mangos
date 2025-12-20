'use client'

import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, Cell, AreaChart, Area, PieChart, Pie
} from 'recharts'
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  AlertTriangle, Lightbulb, Activity, Lock, 
  ArrowLeft, Zap, ChevronRight, ChevronDown, CreditCard, Sparkles 
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../../lib/utils'
import { useState, useEffect, useMemo, useTransition } from 'react'
import UpgradeModal from '../../../components/UpgradeModal'
import { getAccountYearlyData } from '../../actions/dashboard-data'

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

// Cores Gerais
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
    healthScore: number
    chartData: any[]
    topCategories: any[]
    ccCategoryData: any[]
    ccTotal: number
    ccTransactions: any[]
    accountNames: string[]
    totalCreditLimit: number
    expenseTypeBreakdown: { fixed: number, variable: number }
  }
  userProfile: { name: string, plan: string }
  selectedMonth: number
  selectedYear: number
}

export default function DashboardClient({ data, userProfile, selectedMonth, selectedYear }: DashboardProps) {
  const router = useRouter()
  
  const [chartFilter, setChartFilter] = useState('all')
  const [selectedAccount, setSelectedAccount] = useState(data.accountNames[0] || '')
  const [specificChartData, setSpecificChartData] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedCcCategory, setSelectedCcCategory] = useState<string | null>(null)

  // VOCABULÁRIO: Resultado (antigo Saldo)
  const currentResult = data.totalIncome - data.currentMonthTotal
  const isSpendingMore = data.percentageChange > 0
  const activeCreditLimit = data.totalCreditLimit > 0 ? data.totalCreditLimit : 0;
  
  const maxCcValue = Math.max(...(data.ccCategoryData.map(c => c.value) || [0]), 1)
  const getCcBarColor = (value: number) => {
      const ratio = value / maxCcValue
      if (ratio > 0.8) return '#a855f7'
      if (ratio > 0.5) return '#6366f1'
      if (ratio > 0.2) return '#818cf8'
      return '#a5b4fc'
  }

  // Dados para o Gráfico de Pizza
  const expenseTypeData = [
    { name: 'Fixas', value: data.expenseTypeBreakdown.fixed },
    { name: 'Variáveis', value: data.expenseTypeBreakdown.variable },
  ].filter(d => d.value > 0)

  const COLORS_PIE = ['#6366f1', '#a5b4fc']

  // --- INSIGHTS (VOCABULÁRIO ATUALIZADO) ---
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
    if (fixedPercent > 70) return `Alerta: ${fixedPercent.toFixed(0)}% das despesas são fixas.`;
    if (variablePercent > 60) return `Atenção: Variáveis representam ${variablePercent.toFixed(0)}%.`;
    return `Perfil: ${fixedPercent.toFixed(0)}% Fixas vs ${variablePercent.toFixed(0)}% Variáveis.`;
  }, [data.expenseTypeBreakdown]);

  useEffect(() => {
    if (selectedAccount) {
      startTransition(async () => {
        const chartData = await getAccountYearlyData(selectedYear, selectedAccount)
        setSpecificChartData(chartData)
      })
    }
  }, [selectedAccount, selectedYear])

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
    return "Despesas do cartão sob análise."
  }, [selectedCcCategory, projection, dailyAvg, data.ccTotal, data.ccCategoryData, activeCreditLimit, isCurrentMonth])

  let scoreTextColor = 'text-red-400', scoreLabel = 'Crítico', scoreDesc = 'Despesas excedendo Receitas.'
  if (data.healthScore >= 80) { scoreTextColor = 'text-indigo-400'; scoreLabel = 'Excelente'; scoreDesc = 'Parabéns! Poupando muito.' }
  else if (data.healthScore >= 50) { scoreTextColor = 'text-yellow-400'; scoreLabel = 'Atenção'; scoreDesc = 'No limite.' }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Visão Geral</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
            <p className="text-zinc-400 text-sm">Olá, <strong className="text-zinc-200">{userProfile.name}</strong></p>
            <span className="hidden sm:block text-zinc-600">•</span>
            {/* VOCABULÁRIO: Resultado */}
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
                {/* VOCABULÁRIO: Período (implícito nos seletores) */}
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
        
        {/* --- COLUNA ESQUERDA (33%) --- */}
        <div className="flex flex-col gap-4">
          
          {/* 1. DESPESAS (VOCABULÁRIO: Gastos -> Despesas) */}
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
                <div className="flex items-center gap-2 bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 backdrop-blur-sm">
                    <Sparkles size={12} className="text-indigo-400 shrink-0" fill="currentColor" fillOpacity={0.2} />
                    <p className="text-[10px] font-medium text-indigo-100 leading-tight line-clamp-2">{expensesInsight}</p>
                </div>
            </div>
          </div>

          {/* 2. GRÁFICO PIZZA (VOCABULÁRIO: Perfil de Despesas) */}
          <div className="card h-[440px] flex flex-col p-5">
              <div className="mb-2">
                  <h3 className="text-base font-semibold text-white">Perfil de Despesas</h3>
                  <p className="text-xs text-zinc-500">Fixas vs Variáveis</p>
              </div>
              {expenseTypeData.length > 0 ? (
                  <div className="flex-1 w-full h-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie 
                                  data={expenseTypeData} 
                                  cx="50%" 
                                  cy="50%" 
                                  innerRadius={70} 
                                  outerRadius={100} 
                                  paddingAngle={5} 
                                  dataKey="value"
                              >
                                  {expenseTypeData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} stroke="rgba(0,0,0,0)" />
                                  ))}
                              </Pie>
                              <Tooltip 
                                  cursor={{fill: 'transparent'}}
                                  contentStyle={{ borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: '12px' }} 
                                  formatter={(value: number) => [formatCurrency(value)]}
                              />
                              <Legend 
                                  verticalAlign="bottom" 
                                  align="center" 
                                  iconType="circle" 
                                  iconSize={10}
                                  wrapperStyle={{ fontSize: '12px', color: '#a1a1aa', paddingBottom: '20px' }} 
                              />
                          </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                          <div className="text-center">
                              <span className="text-[10px] text-zinc-500 uppercase block">Total</span>
                              <span className="text-lg font-bold text-white">{formatCurrency(data.currentMonthTotal)}</span>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-sm">Sem dados classificados.</div>
              )}

              <div className="mt-3">
                  <div className="flex items-center gap-2 bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 backdrop-blur-sm">
                      <Sparkles size={12} className="text-indigo-400 shrink-0" fill="currentColor" fillOpacity={0.2} />
                      <p className="text-[10px] font-medium text-indigo-100 leading-tight line-clamp-2">{profileInsight}</p>
                  </div>
              </div>
          </div>

        </div>

        {/* --- COLUNA DIREITA (66%) --- */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          <div className="grid grid-cols-3 gap-3">
             
             {/* VOCABULÁRIO: Resultado (antigo Saldo) */}
             <div className={`${cardClassBase} h-28 p-4`}>
                <div className="space-y-0.5"><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Resultado</p><h3 className={`text-xl font-bold tracking-tight ${currentResult < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(currentResult)}</h3></div>
                <div className={iconBadgeClass}><Wallet size={16} strokeWidth={2} /></div>
             </div>

             {/* Maior Despesa (VOCABULÁRIO MANTIDO) */}
             <div className={`${cardClassBase} h-28 p-4`}>
                <div className="w-full space-y-0.5"><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Maior despesa</p>{data.highestExpense ? (<><h3 className="text-xs font-semibold text-zinc-200 truncate pr-6" title={data.highestExpense.name}>{data.highestExpense.name}</h3><p className="text-lg font-bold text-zinc-100">{formatCurrency(data.highestExpense.value)}</p></>) : <span className="text-xs text-zinc-600">--</span>}</div>
                <div className={iconBadgeClass}><AlertTriangle size={16} strokeWidth={2} /></div>
             </div>

             {/* Placeholder */}
             <div className={`${cardClassBase} h-28 border-2 border-dashed border-zinc-800 bg-transparent opacity-50 hover:opacity-100 transition-opacity p-4`}>
                <div className="flex items-center justify-center w-full h-full">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Em Breve</span>
                </div>
             </div>
          </div>

          <div className="h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 flex items-center justify-start gap-2.5">
            <Sparkles size={14} className="text-indigo-400 shrink-0" fill="currentColor" fillOpacity={0.2} />
            <p className="text-[11px] font-medium text-indigo-100 truncate">{miniInsight}</p>
          </div>

          {/* 5. FLUXO FINANCEIRO (VOCABULÁRIO: Fluxo de Caixa -> Fluxo Financeiro) */}
          <div className="card h-[440px] p-5">
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div><h3 className="text-base font-semibold text-white">Fluxo Financeiro</h3><p className="text-xs text-zinc-500">Anual ({selectedYear})</p></div>
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
                        <Tooltip cursor={{ stroke: '#52525b', strokeWidth: 1 }} contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', background: '#18181b', color: '#fff', fontSize: '12px' }} formatter={(value: number) => [formatCurrency(value)]} />
                        <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}/>
                        {(chartFilter === 'all' || chartFilter === 'expense') && (<Line type="monotone" dataKey="expense" name="Despesas" stroke={colors.red} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: colors.red }} />)}
                        {(chartFilter === 'all' || chartFilter === 'income') && (<Line type="monotone" dataKey="income" name="Receitas" stroke={colors.green} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: colors.green }} />)}
                    </LineChart>
                </ResponsiveContainer>
            </div>
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
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${cat.percent}%`, backgroundColor: index === 0 ? '#6366F1' : index === 1 ? '#818CF8' : '#A5B4FC' }} /></div>
                </div>))) : ( <div className="flex h-[200px] items-center justify-center text-zinc-600 text-sm">Nenhuma despesa neste período.</div> )}
            </div>
          </div>
          
          <div className="card rounded-2xl p-5">
            <div className="mb-6 flex items-center justify-between">
              <div><h3 className="text-base font-semibold text-white">Evolução por Categoria</h3><p className="text-xs text-zinc-500">Histórico anual</p></div>
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

           <div className="mt-auto bg-zinc-800/20 border border-white/5 rounded-xl p-3 flex gap-3 items-start animate-in fade-in">
              <div className={`p-1.5 rounded-md shrink-0 ${selectedCcCategory ? 'bg-indigo-500/20 text-indigo-400' : 'bg-yellow-500/10 text-yellow-500'}`}>{selectedCcCategory ? <Zap size={14}/> : <AlertTriangle size={14}/>}</div>
              <div><p className="text-[11px] text-zinc-300 leading-snug font-medium line-clamp-2">{dynamicInsightText}</p></div>
           </div>
           
        </div>

        <div className="w-full md:w-[60%] p-6 flex flex-col h-full bg-zinc-900/10">
           <div className="flex justify-between items-center mb-4">
              {/* VOCABULÁRIO: Lançamentos (antigo Extrato da Fatura) */}
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
      
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}