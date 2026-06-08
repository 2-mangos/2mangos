'use client'

import { useState, useMemo, useEffect } from 'react'
import { Account } from '@/lib/types'
import { 
  TrendingUp, CreditCard as CardIcon, Calendar, ArrowUpRight,
  Calculator, PieChart as PieChartIcon, Lightbulb, DollarSign, ChevronDown
} from 'lucide-react'
import UpgradeModal from '@/components/UpgradeModal'
// AQUI ESTÁ A CORREÇÃO: Adicionado o YAxis
import { XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, Label, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCardStats } from '@/app/actions/cards'


interface CardsClientProps {
  initialAccounts: Account[]
  userPlan: 'free' | 'premium'
}

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

const InsightBar = ({ text }: { text: string }) => (
  <div className="group flex items-start sm:items-center gap-3 bg-white/5 px-4 py-3 sm:py-2.5 rounded-xl border border-white/5 transition-colors hover:bg-white/10 cursor-default animate-in fade-in">
      <div className="relative shrink-0 mt-0.5 sm:mt-0">
          <Lightbulb size={16} className="text-indigo-400 group-hover:text-amber-300 transition-all duration-500" />
      </div>
      <p className="text-xs font-medium text-zinc-300 leading-relaxed sm:leading-snug">{text}</p>
  </div>
)

export default function CardsClient({ initialAccounts, userPlan }: CardsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedMonth = parseInt(searchParams.get('month') || new Date().getMonth().toString())
  const selectedYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

  const [selectedCardId, setSelectedCardId] = useState(initialAccounts[0]?.id || null)
  const [stats, setStats] = useState<{totalFatura: number, categoryData: any[], evolutionData: any[]} | null>(null)
  const [loading, setLoading] = useState(false)
  
  const isFree = userPlan?.toLowerCase() === 'free'
  const selectedCard = useMemo(() => initialAccounts.find(acc => acc.id === selectedCardId), [selectedCardId, initialAccounts])

  useEffect(() => {
    async function loadData() {
      if (!selectedCard) return
      setLoading(true)
      const data = await getCardStats(selectedCard.name, selectedMonth, selectedYear)
      setStats(data)
      setLoading(false)
    }
    loadData()
  }, [selectedCardId, selectedMonth, selectedYear, selectedCard])

  const totalFaturaAtual = stats?.totalFatura || 0
  const categoryData = stats?.categoryData || []
  const evolutionData = stats?.evolutionData || []
  const limiteTotal = selectedCard?.credit_limit || 0
  const percentualUso = limiteTotal > 0 ? ((totalFaturaAtual / limiteTotal) * 100).toFixed(1) : "0"

  const handleFilterChange = (month: number, year: number) => {
    router.push(`/cards?month=${month}&year=${year}`)
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 animate-in fade-in duration-500">
        
        {/* HEADER PADRONIZADO (Igual ao Expenses e Incomes) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-14 md:pt-0 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Meus Cartões</h1>
            <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2">
              <CardIcon size={14} className="text-indigo-400"/>
              Análise detalhada de faturas e limites
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
             <div className="bg-zinc-900/80 border border-white/10 flex items-center p-1.5 rounded-lg w-full sm:w-auto justify-between">
                <div className="flex items-center gap-2 px-3 border-r border-white/10 shrink-0">
                   <Calendar size={14} className="text-indigo-400"/>
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:block">Fatura</span>
                </div>
                <select 
                    value={selectedMonth} 
                    onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} 
                    className="bg-transparent text-zinc-200 text-sm font-medium py-1.5 px-3 flex-1 cursor-pointer outline-none [&>option]:bg-zinc-900"
                >
                   {monthNames.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
                <select 
                    value={selectedYear} 
                    onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} 
                    className="bg-transparent text-zinc-200 text-sm font-medium py-1.5 px-3 border-l border-white/5 flex-1 cursor-pointer outline-none [&>option]:bg-zinc-900"
                >
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
             </div>
          </div>
        </div>

        {/* SELETOR DE CARTÕES (Com scroll horizontal nativo para telemóveis) */}
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar w-full snap-x">
          {initialAccounts.map((card) => (
            <button 
              key={card.id} 
              onClick={() => setSelectedCardId(card.id)} 
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all border whitespace-nowrap snap-start shrink-0 ${
                selectedCardId === card.id 
                ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-lg' 
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              {card.name}
            </button>
          ))}
        </div>

        <div className={`relative transition-all duration-500 ${isFree ? 'blur-md pointer-events-none opacity-40 select-none' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* COLUNA ESQUERDA (Detalhes do Cartão) */}
            <div className="lg:col-span-3 space-y-6 w-full overflow-hidden">
              
              {/* KPI CARDS (H-auto para Mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card h-auto min-h-[112px] p-5 sm:p-6 flex flex-col justify-between relative shadow-sm">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Fatura Atual</p>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{loading ? "..." : formatCurrency(totalFaturaAtual)}</h3>
                  <div className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5"><DollarSign size={16} /></div>
                </div>
                <div className="card h-auto min-h-[112px] p-5 sm:p-6 flex flex-col justify-between relative shadow-sm">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Uso do Limite</p>
                  <h3 className={`text-2xl font-bold tracking-tight ${Number(percentualUso) > 80 ? 'text-rose-400' : 'text-indigo-400'}`}>{percentualUso}%</h3>
                  <div className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5"><TrendingUp size={16} /></div>
                </div>
                <div className="card h-auto min-h-[112px] p-5 sm:p-6 flex flex-col justify-between relative shadow-sm">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Melhor Dia</p>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Dia {selectedCard?.closing_day}</h3>
                  <div className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5"><Calendar size={16} /></div>
                </div>
              </div>

              {/* WIDGET DO CARTÃO (Otimizado para espaçamentos em Mobile) */}
              <div className="card bg-zinc-900/40 backdrop-blur-md p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-white/5 shadow-xl relative overflow-hidden">
                  <div className="flex items-center gap-4 sm:gap-5 mb-10 sm:mb-16 relative z-10">
                    <div className="relative group shrink-0">
                      <div className="absolute inset-0 blur-2xl opacity-20 transition-opacity group-hover:opacity-40" style={{ backgroundColor: selectedCard?.color }} />
                      <CardIcon size={38} className="sm:w-[42px] sm:h-[42px]" style={{ color: selectedCard?.color }} strokeWidth={1.5} />
                    </div>
                    <div className="truncate">
                      <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight truncate">
                        {selectedCard?.name}
                      </h2>
                      <p className="text-[9px] sm:text-[10px] text-zinc-500 font-medium uppercase tracking-[0.2em] mt-0.5">Bank Card</p>
                    </div>
                  </div>
                  
                  {/* Grid de Informações Financeiras do Cartão */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6 mb-8 sm:mb-10 relative z-10">
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Limite Total</p>
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">{formatCurrency(limiteTotal)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Disponível</p>
                        <p className="text-xs sm:text-sm font-semibold text-emerald-400 truncate">{formatCurrency(limiteTotal - totalFaturaAtual)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 text-blue-400">Fechamento</p>
                        <p className="text-xs sm:text-sm font-semibold text-white">Dia {selectedCard?.closing_day}</p>
                    </div>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Vencimento</p>
                        <p className="text-xs sm:text-sm font-semibold text-white">Dia {selectedCard?.due_day}</p>
                    </div>
                  </div>
                  
                  {/* Barra de Progresso do Limite */}
                  <div className="h-1.5 sm:h-2 bg-zinc-800 rounded-full overflow-hidden relative z-10">
                    <div 
                      className="h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)]" 
                      style={{ 
                          width: `${percentualUso}%`,
                          backgroundColor: Number(percentualUso) > 80 ? '#fb7185' : selectedCard?.color || '#6366f1'
                      }} 
                    />
                  </div>
              </div>

              {/* Insights */}
              <div className="card p-5 sm:p-6 border-white/5 h-auto">
                <h4 className="text-sm font-bold text-zinc-400 uppercase mb-4 tracking-wider">Insights de Cartão</h4>
                <div className="space-y-3">
                  <InsightBar text={`Melhor dia para compra: dia ${selectedCard?.closing_day}. Utilize para ganhar fôlego financeiro no próximo ciclo.`} />
                  <InsightBar text={`Atenção: Seu uso de limite está em ${percentualUso}%. ${Number(percentualUso) > 75 ? 'Considere reduzir gastos variáveis.' : 'Mantenha o controle para evitar juros rotativos.'}`} />
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA (GRÁFICOS) */}
            <div className="lg:col-span-2 space-y-6 w-full overflow-hidden">
              
              {/* Gráfico 1: Evolução Mensal (H-auto para o ResponsiveContainer não quebrar) */}
              <div className="card h-auto min-h-[320px] p-5 sm:p-6 flex flex-col">
                <h4 className="text-sm font-bold text-zinc-400 uppercase mb-4 shrink-0 tracking-wider">Evolução Mensal</h4>
                <div className="h-[220px] sm:h-[250px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} minTickGap={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(value) => `${value}`} />
                      <Tooltip 
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        contentStyle={{ borderRadius: '12px', background: 'rgba(24, 24, 27, 0.95)', backdropFilter: 'blur(8px)', border: '1px solid #3f3f46', color: '#fff', fontSize: '12px' }}
                        itemStyle={{ color: '#e4e4e7', fontWeight: 'bold' }}
                        formatter={(value: number) => [formatCurrency(value), 'Fatura']}
                      />
                      <Area type="monotone" dataKey="valor" stroke="#818cf8" strokeWidth={3} fill="url(#colorValue)" activeDot={{ r: 5, fill: "#818cf8", stroke: '#18181b', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Distribuição de Gastos (Empilha no mobile com flex-col) */}
              <div className="card h-auto min-h-[320px] p-5 sm:p-6 flex flex-col">
                <h4 className="text-sm font-bold text-zinc-400 uppercase mb-4 sm:mb-6 shrink-0 tracking-wider">Distribuição de Gastos</h4>
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-2 flex-1 w-full">
                  
                  {/* Container do Gráfico Pie */}
                  <div className="w-full sm:w-[50%] h-[200px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={categoryData.length > 0 ? categoryData : [{ name: 'VAZIO', value: 1 }]} 
                          innerRadius="65%" 
                          outerRadius="90%" 
                          paddingAngle={4} 
                          dataKey="value"
                        >
                          {categoryData.length > 0 ? (
                            categoryData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)
                          ) : (
                            <Cell fill="#27272a" stroke="none" />
                          )}
                          <Label 
                            value={formatCurrency(totalFaturaAtual)} 
                            position="center" 
                            fill="#fff" 
                            style={{ fontSize: '13px', fontWeight: 'bold' }} 
                          />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', background: 'rgba(24, 24, 27, 0.95)', border: '1px solid #3f3f46', color: '#fff', fontSize: '11px', padding: '8px 12px' }}
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          formatter={(value: number, name: any, props: any) => {
                            const categoryName = props.payload.name;
                            const percent = totalFaturaAtual > 0 ? ((value / totalFaturaAtual) * 100).toFixed(1) : "0";
                            return [`${percent}%`, categoryName];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legenda Lateral/Inferior */}
                  <div className="w-full sm:w-[50%] space-y-2 px-2 sm:pl-4 max-h-[180px] sm:max-h-[200px] overflow-y-auto custom-scrollbar">
                    {categoryData.length > 0 ? categoryData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 pt-1 last:border-0 hover:bg-white/5 rounded-lg px-2 transition-colors">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-zinc-300 font-medium truncate">{item.name}</span>
                        </div>
                        <span className="text-xs text-white font-bold whitespace-nowrap">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    )) : <p className="text-xs text-zinc-600 italic text-center sm:text-left mt-4">Nenhum gasto detalhado neste período.</p>}
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
        
        <UpgradeModal isOpen={false} onClose={() => {}} />
    </div>
  )
}