'use client'

import { useState, useMemo } from 'react'
import { Account } from '@/lib/types'
import { 
  TrendingUp, 
  CreditCard as CardIcon, 
  Zap, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight,
  Calculator,
  PieChart as PieChartIcon,
  Lightbulb,
  DollarSign,
  Plus,
  ChevronDown
} from 'lucide-react'
import UpgradeModal from '@/components/UpgradeModal'
import { 
  XAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell 
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

interface CardsClientProps {
  initialAccounts: Account[]
  userPlan: 'free' | 'premium'
}

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

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

export default function CardsClient({ initialAccounts, userPlan }: CardsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Sincronização de filtros com a URL (Padrão Dashboard)
  const selectedMonth = parseInt(searchParams.get('month') || new Date().getMonth().toString())
  const selectedYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState(initialAccounts[0]?.id || null)
  
  const isFree = userPlan?.toLowerCase() === 'free'
  const selectedCard = useMemo(() => 
    initialAccounts.find(acc => acc.id === selectedCardId), 
  [selectedCardId, initialAccounts])

  const handleFilterChange = (month: number, year: number) => {
    router.push(`/cards?month=${month}&year=${year}`)
  }

  const evolutionData = [
    { name: 'Jan', valor: 2100 },
    { name: 'Fev', valor: 1800 },
    { name: 'Mar', valor: 2400 },
    { name: 'Abr', valor: 2200 },
    { name: 'Mai', valor: 2850.40 },
    { name: 'Jun', valor: 1900 },
  ]

  const categoryData = [
    { name: 'Alimentação', value: 1200, color: '#6366f1' },
    { name: 'Transporte', value: 450, color: '#818cf8' },
    { name: 'Lazer', value: 800, color: '#a5b4fc' },
    { name: 'Outros', value: 400, color: '#312e81' },
  ]

  const totalFaturaAtual = 2850.40
  const limiteTotal = selectedCard?.credit_limit || 0
  const percentualUso = ((totalFaturaAtual / (limiteTotal || 1)) * 100).toFixed(1)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER COM FILTROS E BOTÃO NOVO CARTÃO (PADRÃO DASHBOARD) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Meus Cartões</h1>
          <p className="text-zinc-400 text-sm mt-1">Análise detalhada de faturas e limites</p>
        </div>

        <div className="flex items-center gap-3">
          {/* BOTÃO NOVO CARTÃO */}
          <button 
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
            onClick={() => {}} // Ainda não joga para lugar nenhum
          >
            <Plus size={18} />
            Novo Cartão
          </button>

          {/* FILTROS DE DATA PADRONIZADOS */}
          <div className="flex items-center bg-zinc-900/50 border border-white/5 rounded-lg p-1">
             <div className="relative">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} 
                  className="bg-transparent text-zinc-300 text-sm font-medium py-1.5 pl-3 pr-2 cursor-pointer hover:text-white outline-none [&>option]:bg-zinc-900"
                >
                  {monthNames.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
             </div>
             <div className="relative border-l border-white/5">
                <select 
                  value={selectedYear} 
                  onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} 
                  className="bg-transparent text-zinc-300 text-sm font-medium py-1.5 pl-2 pr-6 cursor-pointer hover:text-white outline-none [&>option]:bg-zinc-900"
                >
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
             </div>
          </div>
        </div>
      </div>

      {/* SELETOR DE CARTÕES (BOTÕES) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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

      {/* CONTEÚDO DO COCKPIT */}
      <div className={`relative transition-all duration-500 ${isFree ? 'blur-md pointer-events-none opacity-40 select-none' : ''}`}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card h-28 p-5 flex flex-col justify-between relative">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fatura Atual</p>
                <h3 className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalFaturaAtual)}</h3>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5">
                  <DollarSign size={16} />
                </div>
              </div>

              <div className="card h-28 p-5 flex flex-col justify-between relative">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Uso do Limite</p>
                <h3 className={`text-xl font-bold tracking-tight ${Number(percentualUso) > 80 ? 'text-rose-400' : 'text-indigo-400'}`}>
                  {percentualUso}%
                </h3>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5">
                  <TrendingUp size={16} />
                </div>
              </div>

              <div className="card h-28 p-5 flex flex-col justify-between relative">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Melhor Dia</p>
                <h3 className="text-xl font-bold text-white tracking-tight">Dia {selectedCard?.closing_day}</h3>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5">
                  <Calendar size={16} />
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-zinc-900 to-black p-8 rounded-[2rem] border-white/5">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-16">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tighter uppercase leading-none">{selectedCard?.name}</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">Premium Access</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10" style={{ color: selectedCard?.color }}>
                    <CardIcon size={32} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Limite Total</p>
                    <p className="text-sm font-bold text-white">{formatCurrency(limiteTotal)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Disponível</p>
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(limiteTotal - totalFaturaAtual)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fechamento</p>
                    <p className="text-sm font-bold text-blue-400">Dia {selectedCard?.closing_day}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Vencimento</p>
                    <p className="text-sm font-bold text-white">Dia {selectedCard?.due_day}</p>
                  </div>
                </div>

                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${Number(percentualUso) > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                    style={{ width: `${percentualUso}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <InsightBar text={`Melhor dia para compra: dia ${selectedCard?.closing_day}. Utilize para ganhar fôlego financeiro.`} />
              <InsightBar text={`Atenção: Seu uso de limite está em ${percentualUso}%. Mantenha o controle dos seus gastos.`} />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="card h-[300px] p-5">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-indigo-400" /> Evolução Mensal
              </h4>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#71717a' }} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: '12px' }} 
                      formatter={(value: number) => [formatCurrency(value), 'Fatura']}
                    />
                    <Area type="monotone" dataKey="valor" stroke="#6366f1" strokeWidth={2} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card h-[300px] p-5">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <PieChartIcon size={14} className="text-indigo-400" /> Categorias
              </h4>
              <div className="flex h-[200px] items-center">
                <div className="w-1/2 space-y-2">
                  {categoryData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-zinc-500 font-bold truncate uppercase">{item.name}</span>
                    </div>
                  ))}
                </div>
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} innerRadius={50} outerRadius={65} paddingAngle={4} dataKey="value">
                        {categoryData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card p-8 flex flex-col items-center justify-center">
              <h4 className="text-sm font-bold text-white mb-6 uppercase tracking-widest text-center">Operações</h4>
              <div className="space-y-3 w-full">
                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-white/5 hover:border-indigo-500/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <Calculator size={18} className="text-zinc-500 group-hover:text-indigo-400" />
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Simular Compra</span>
                  </div>
                  <ArrowUpRight size={16} className="text-zinc-600 group-hover:text-white" />
                </button>
                <button className="w-full py-4 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-sm hover:bg-white transition-all shadow-lg">
                  Explorar Fatura
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
    </div>
  )
}