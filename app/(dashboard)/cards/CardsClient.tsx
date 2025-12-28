'use client'

import { useState, useMemo } from 'react'
import { Account } from '@/lib/types'
import { 
  TrendingUp, 
  CreditCard as CardIcon, 
  Lock, 
  Zap, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight,
  Calculator,
  PieChart as PieChartIcon
} from 'lucide-react'
import UpgradeModal from '@/components/UpgradeModal'
import { 
  XAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell 
} from 'recharts'

interface CardsClientProps {
  initialAccounts: Account[]
  userPlan: 'free' | 'premium'
}

export default function CardsClient({ initialAccounts, userPlan }: CardsClientProps) {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState(initialAccounts[0]?.id || null)
  
  const isFree = userPlan?.toLowerCase() === 'free'

  const selectedCard = useMemo(() => 
    initialAccounts.find(acc => acc.id === selectedCardId), 
  [selectedCardId, initialAccounts])

  // Mock de dados para o Cockpit
  const totalFaturaAtual = 2850.40
  const limiteTotal = selectedCard?.credit_limit || 0
  const percentualUso = ((totalFaturaAtual / (limiteTotal || 1)) * 100).toFixed(1)

  const evolutionData = [
    { dia: '01', valor: 400 },
    { dia: '10', valor: 1200 },
    { dia: '20', valor: 1800 },
    { dia: '30', valor: totalFaturaAtual },
  ]

  const categoryData = [
    { name: 'Alimentação', value: 1200, color: '#6366f1' },
    { name: 'Transporte', value: 450, color: '#818cf8' },
    { name: 'Lazer', value: 800, color: '#4f46e5' },
    { name: 'Outros', value: 400, color: '#312e81' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 1. CABEÇALHO ÚNICO PADRONIZADO */}
      <div className="flex flex-col gap-4">
        
        {/* 2. SELETOR DE CARTÕES (ABAIXO DO SUBTÍTULO) */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {initialAccounts.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all border whitespace-nowrap ${
                selectedCardId === card.id 
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-lg' 
                  : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {card.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONTEÚDO DO COCKPIT */}
      <div className={`relative transition-all duration-500 ${isFree ? 'blur-md pointer-events-none opacity-40 select-none' : ''}`}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* COLUNA ESQUERDA (60%) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm">
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Fatura Atual</p>
                <p className="text-2xl font-bold text-zinc-100 italic">R$ {totalFaturaAtual.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm">
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Uso do Limite</p>
                <p className={`text-2xl font-bold italic ${Number(percentualUso) > 80 ? 'text-red-400' : 'text-indigo-400'}`}>
                  {percentualUso}%
                </p>
              </div>
              <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm">
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Projeção</p>
                <p className="text-2xl font-bold text-zinc-500 italic">R$ 3.120,00</p>
              </div>
            </div>

            {/* DESIGN DO CARTÃO */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border border-zinc-800 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-16">
                  <div>
                    <h2 className="text-3xl font-bold text-zinc-100 tracking-tighter uppercase leading-none">{selectedCard?.name}</h2>
                    <p className="text-zinc-600 font-mono mt-2 italic text-xs uppercase tracking-widest opacity-60">Premium Access</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-100/5 border border-zinc-100/10" style={{ color: selectedCard?.color }}>
                    <CardIcon size={32} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 text-xs">
                  <div className="space-y-1">
                    <p className="text-zinc-500 uppercase font-bold tracking-tighter">Limite Total</p>
                    <p className="text-base font-bold text-zinc-100 italic">R$ {limiteTotal.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-500 uppercase font-bold tracking-tighter">Disponível</p>
                    <p className="text-base font-bold text-emerald-400 italic">R$ {(limiteTotal - totalFaturaAtual).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-500 uppercase font-bold tracking-tighter">Melhor Dia</p>
                    <p className="text-base font-bold text-blue-400 italic">Dia {selectedCard?.closing_day}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-500 uppercase font-bold tracking-tighter">Vencimento</p>
                    <p className="text-base font-bold text-zinc-100 italic">Dia {selectedCard?.due_day}</p>
                  </div>
                </div>

                <div className="h-2 bg-zinc-800/50 rounded-full overflow-hidden border border-zinc-700/30">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${Number(percentualUso) > 80 ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${percentualUso}%` }}
                  />
                </div>
              </div>
            </div>

            {/* INSIGHTS */}
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] p-8">
              <h4 className="text-indigo-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Zap size={14} fill="currentColor" /> Bleu IA Insights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400">
                    <Calendar size={18} />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Melhor dia para compra: <span className="text-zinc-100 font-semibold">{selectedCard?.closing_day}</span>. Ganhe fôlego financeiro.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0 text-red-400">
                    <AlertTriangle size={18} />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Uso de limite em <span className="text-red-400 font-bold">{percentualUso}%</span>. Cuidado com gastos variáveis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA (40%) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-[2rem] h-[300px] backdrop-blur-sm">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-indigo-400" /> Evolução Mensal
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="valor" stroke="#6366f1" strokeWidth={2} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-[2rem] h-[300px] backdrop-blur-sm">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <PieChartIcon size={14} className="text-indigo-400" /> Categorias
              </h4>
              <div className="flex h-[200px] items-center">
                <div className="w-1/2 space-y-2">
                  {categoryData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-zinc-500 font-bold truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} innerRadius={50} outerRadius={65} paddingAngle={4} dataKey="value">
                        {categoryData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-[2rem] p-8">
              <h4 className="text-zinc-100 font-bold text-sm mb-6 uppercase tracking-widest text-center">Operações</h4>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-zinc-100 group">
                  <div className="flex items-center gap-3">
                    <Calculator size={18} />
                    <span className="text-sm font-medium">Simular Compra</span>
                  </div>
                  <ArrowUpRight size={16} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                </button>
                <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-zinc-100 text-zinc-950 font-bold text-sm hover:bg-white transition-all shadow-lg shadow-white/5">
                  Explorar Fatura
                  <TrendingUp size={16} />
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