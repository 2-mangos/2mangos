'use client'

import { useState, useMemo, useEffect } from 'react'
import { Account } from '@/lib/types'
import { 
  TrendingUp, CreditCard as CardIcon, Calendar, ArrowUpRight,
  Calculator, PieChart as PieChartIcon, Lightbulb, DollarSign, Plus, ChevronDown
} from 'lucide-react'
import UpgradeModal from '@/components/UpgradeModal'
import { XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, Label } from 'recharts'
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
  <div className="group flex items-center gap-3 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 transition-colors hover:bg-white/10 cursor-default animate-in fade-in">
      <div className="relative shrink-0">
          <Lightbulb size={16} className="text-indigo-400 group-hover:text-amber-300 transition-all duration-500" />
      </div>
      <p className="text-xs font-medium text-zinc-300 leading-snug line-clamp-2">{text}</p>
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Meus Cartões</h1>
          <p className="text-zinc-400 text-sm mt-1">Análise detalhada de faturas e limites</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-900/20">
            <Plus size={18} /> Novo Cartão
          </button>
          <div className="flex items-center bg-zinc-900/50 border border-white/5 rounded-lg p-1">
             <select value={selectedMonth} onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} className="bg-transparent text-zinc-300 text-sm font-medium py-1.5 pl-3 pr-2 cursor-pointer outline-none">
               {monthNames.map((m, i) => (<option key={i} value={i} className="bg-zinc-900">{m}</option>))}
             </select>
             <div className="relative border-l border-white/5">
                <select value={selectedYear} onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} className="bg-transparent text-zinc-300 text-sm font-medium py-1.5 pl-2 pr-6 cursor-pointer outline-none">
                   {years.map((y) => (<option key={y} value={y} className="bg-zinc-900">{y}</option>))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
             </div>
          </div>
        </div>
      </div>

      {/* SELETOR DE CARTÕES */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mt-8">
        {initialAccounts.map((card) => (
          <button 
            key={card.id} 
            onClick={() => setSelectedCardId(card.id)} 
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all border whitespace-nowrap ${
              selectedCardId === card.id 
              ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-lg' 
              : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-zinc-700'
            }`}
          >
            {card.name}
          </button>
        ))}
      </div>

      <div className={`relative transition-all duration-500 ${isFree ? 'blur-md pointer-events-none opacity-40 select-none' : ''}`}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card h-28 p-5 flex flex-col justify-between relative shadow-sm">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fatura Atual</p>
                <h3 className="text-xl font-bold text-white tracking-tight">{loading ? "..." : formatCurrency(totalFaturaAtual)}</h3>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5"><DollarSign size={16} /></div>
              </div>
              <div className="card h-28 p-5 flex flex-col justify-between relative shadow-sm">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Uso do Limite</p>
                <h3 className={`text-xl font-bold tracking-tight ${Number(percentualUso) > 80 ? 'text-rose-400' : 'text-indigo-400'}`}>{percentualUso}%</h3>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5"><TrendingUp size={16} /></div>
              </div>
              <div className="card h-28 p-5 flex flex-col justify-between relative shadow-sm">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Melhor Dia</p>
                <h3 className="text-xl font-bold text-white tracking-tight">Dia {selectedCard?.closing_day}</h3>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5"><Calendar size={16} /></div>
              </div>
            </div>

            {/* WIDGET DO CARTÃO ATUALIZADO */}
            <div className="card bg-zinc-900/40 backdrop-blur-md p-8 rounded-[2rem] border-white/5 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-5 mb-16 relative z-10">
                  <div className="relative group">
                    <div className="absolute inset-0 blur-2xl opacity-20 transition-opacity group-hover:opacity-40" style={{ backgroundColor: selectedCard?.color }} />
                    <CardIcon size={42} style={{ color: selectedCard?.color }} strokeWidth={1.5} className="relative z-10" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white tracking-tight">
                      {selectedCard?.name}
                    </h2>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-[0.2em]">Bank Card</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 relative z-10">
                  <div><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Limite Total</p><p className="text-sm font-semibold text-white">{formatCurrency(limiteTotal)}</p></div>
                  <div><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Disponível</p><p className="text-sm font-semibold text-emerald-400">{formatCurrency(limiteTotal - totalFaturaAtual)}</p></div>
                  <div><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 text-blue-400">Fechamento</p><p className="text-sm font-semibold text-white">Dia {selectedCard?.closing_day}</p></div>
                  <div><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Vencimento</p><p className="text-sm font-semibold text-white">Dia {selectedCard?.due_day}</p></div>
                </div>
                
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative z-10">
                  <div 
                    className={`h-full transition-all duration-1000 shadow-[0_0_15px_rgba(0,0,0,0.5)]`} 
                    style={{ 
                        width: `${percentualUso}%`,
                        backgroundColor: Number(percentualUso) > 80 ? '#fb7185' : selectedCard?.color || '#6366f1'
                    }} 
                  />
                </div>
            </div>

            <div className="card p-6 border-white/5">
              <h4 className="text-sm font-bold text-zinc-400 uppercase mb-4">Insights de Cartão</h4>
              <div className="space-y-3">
                <InsightBar text={`Melhor dia para compra: dia ${selectedCard?.closing_day}. Utilize para ganhar fôlego financeiro no próximo ciclo.`} />
                <InsightBar text={`Atenção: Seu uso de limite está em ${percentualUso}%. ${Number(percentualUso) > 75 ? 'Considere reduzir gastos variáveis.' : 'Mantenha o controle para evitar juros.'}`} />
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA (GRÁFICOS) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card h-[300px] p-5">
              <h4 className="text-sm font-bold text-zinc-400 uppercase mb-4">Evolução Mensal</h4>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', background: '#fff', border: '1px solid #e4e4e7', color: '#18181b', fontSize: '12px' }}
                      itemStyle={{ color: '#18181b' }}
                      formatter={(value: number) => [formatCurrency(value), 'Valor']}
                    />
                    <Area type="monotone" dataKey="valor" stroke="#6366f1" strokeWidth={2} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card h-[300px] p-5">
              <h4 className="text-sm font-bold text-zinc-400 uppercase mb-4">Distribuição de Gastos</h4>
              <div className="flex h-[200px] items-center">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={categoryData.length > 0 ? categoryData : [{ name: 'VAZIO', value: 1 }]} 
                        innerRadius={50} 
                        outerRadius={80} 
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
                          style={{ fontSize: '12px', fontWeight: 'bold' }} 
                        />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', background: '#fff', border: '1px solid #e4e4e7', color: '#18181b', fontSize: '11px' }}
                        itemStyle={{ color: '#18181b' }}
                        formatter={(value: number, name: any, props: any) => {
                          const categoryName = props.payload.name;
                          const percent = totalFaturaAtual > 0 ? ((value / totalFaturaAtual) * 100).toFixed(1) : "0";
                          return [`${percent}%`, categoryName];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2 pl-4">
                  {categoryData.length > 0 ? categoryData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 border-b border-white/5 pb-1">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] text-zinc-400 font-bold uppercase truncate">{item.name}</span>
                      </div>
                      <span className="text-[10px] text-white font-bold whitespace-nowrap">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  )) : <p className="text-[10px] text-zinc-600 italic">Nenhum gasto detalhado neste período.</p>}
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