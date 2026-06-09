'use client'

import { useState, useMemo, useEffect } from 'react'
import { Account } from '@/lib/types'
import { 
  TrendingUp, CreditCard as CardIcon, Calendar, 
  Lightbulb, DollarSign, ChevronDown, Wifi, AlertCircle, 
  ArrowRight, ShieldCheck, PieChart as PieIcon, Activity
} from 'lucide-react'
import UpgradeModal from '@/components/UpgradeModal'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, Label } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCardStats } from '@/app/actions/cards'

interface CardsClientProps {
  initialAccounts: Account[]
  userPlan: 'free' | 'premium'
}

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

const InsightBar = ({ text, type = 'info' }: { text: string, type?: 'info' | 'warning' | 'success' }) => {
  const colors = {
    info: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 group-hover:text-indigo-300',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20 group-hover:text-amber-300',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 group-hover:text-emerald-300'
  }
  
  return (
    <div className="group flex items-start gap-3 bg-zinc-900/50 px-4 py-3.5 rounded-xl border border-white/5 transition-all hover:bg-zinc-800/80 cursor-default animate-in fade-in">
        <div className={`relative shrink-0 mt-0.5 p-1.5 rounded-lg border ${colors[type].split(' ')[1]} ${colors[type].split(' ')[2]} ${colors[type].split(' ')[0]}`}>
            {type === 'warning' ? <AlertCircle size={14} /> : type === 'success' ? <ShieldCheck size={14} /> : <Lightbulb size={14} />}
        </div>
        <p className="text-xs font-medium text-zinc-300 leading-relaxed">{text}</p>
    </div>
  )
}

export default function CardsClient({ initialAccounts, userPlan }: CardsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedMonth = parseInt(searchParams.get('month') || new Date().getMonth().toString())
  const selectedYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

  // Filtra apenas as contas que são cartões de crédito
  const creditCards = useMemo(() => initialAccounts.filter(acc => acc.is_credit_card), [initialAccounts])

  const [selectedCardId, setSelectedCardId] = useState(creditCards[0]?.id || null)
  const [stats, setStats] = useState<{totalFatura: number, categoryData: any[], evolutionData: any[]} | null>(null)
  const [loading, setLoading] = useState(false)

  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const isFree = userPlan?.toLowerCase() === 'free'
  const selectedCard = useMemo(() => creditCards.find(acc => acc.id === selectedCardId), [selectedCardId, creditCards])

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
  const limiteDisponivel = Math.max(0, limiteTotal - totalFaturaAtual)
  const percentualUso = limiteTotal > 0 ? Math.min(100, (totalFaturaAtual / limiteTotal) * 100).toFixed(1) : "0"

  const handleFilterChange = (month: number, year: number) => {
    router.push(`/cards?month=${month}&year=${year}`)
  }

  // Cores dinâmicas baseadas no uso do limite
  const limitColorHex = Number(percentualUso) > 85 ? '#f43f5e' : Number(percentualUso) > 60 ? '#f59e0b' : '#10b981'
  const cardThemeColor = selectedCard?.color || '#6366f1'

  // Empty State (Se não tiver cartões)
  if (creditCards.length === 0) {
      return (
          <div className="space-y-6 sm:space-y-8 pb-20 animate-in fade-in duration-500 pt-14 md:pt-0">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Meus Cartões</h1>
                  <p className="text-zinc-400 mt-1 text-sm">Análise detalhada de faturas e limites</p>
                </div>
             </div>
             <div className="card rounded-3xl p-10 sm:p-16 text-center flex flex-col items-center justify-center border border-dashed border-white/10 bg-zinc-900/20 mt-10">
                  <div className="bg-zinc-900 p-5 rounded-full mb-6 ring-1 ring-white/10 shadow-2xl">
                    <CardIcon size={40} className="text-zinc-600"/>
                  </div>
                  <h3 className="text-xl text-white font-bold mb-2 tracking-tight">Nenhum Cartão Encontrado</h3>
                  <p className="text-zinc-500 text-sm max-w-md mb-8 leading-relaxed">Você ainda não possui contas classificadas como Cartão de Crédito. Acesse a página de Categorias e configure os seus cartões para habilitar este painel.</p>
                  <button onClick={() => router.push('/accounts')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center gap-2">
                    Configurar Cartões <ArrowRight size={18}/>
                  </button>
              </div>
          </div>
      )
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 animate-in fade-in duration-500">
        
        {/* =========================================================
            HEADER & SELETORES
        ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-14 md:pt-0 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Meus Cartões</h1>
            <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2">
              <CardIcon size={14} className="text-indigo-400"/>
              Centro de controlo de faturas e limites
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
             <div className="bg-zinc-900/80 border border-white/10 flex items-center p-1.5 rounded-lg w-full sm:w-auto justify-between shadow-sm">
                <div className="flex items-center gap-2 px-3 border-r border-white/10 shrink-0">
                   <Calendar size={14} className="text-indigo-400"/>
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:block">Fatura</span>
                </div>
                <select value={selectedMonth} onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} className="bg-transparent text-zinc-200 text-sm font-medium py-1.5 px-3 flex-1 cursor-pointer outline-none [&>option]:bg-zinc-900">
                   {monthNames.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
                <select value={selectedYear} onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} className="bg-transparent text-zinc-200 text-sm font-medium py-1.5 px-3 border-l border-white/5 flex-1 cursor-pointer outline-none [&>option]:bg-zinc-900">
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
             </div>
          </div>
        </div>

        {/* SELETOR DE CARTÕES TABS */}
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar w-full snap-x">
          {creditCards.map((card) => (
            <button 
              key={card.id} 
              onClick={() => setSelectedCardId(card.id)} 
              className={`px-6 py-3 rounded-xl font-bold text-xs transition-all border whitespace-nowrap snap-start shrink-0 flex items-center gap-2 ${
                selectedCardId === card.id 
                ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-xl scale-100' 
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:border-white/10 hover:bg-zinc-800 scale-95 origin-left'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: card.color }}></div>
              {card.name}
            </button>
          ))}
        </div>

        <div className={`relative transition-all duration-500 ${isFree ? 'blur-md pointer-events-none opacity-40 select-none' : ''}`}>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* =========================================================
                COLUNA ESQUERDA (33%) - O CARTÃO E AS REGRAS
            ========================================================= */}
            <div className="lg:col-span-4 space-y-6 sm:space-y-8 w-full overflow-hidden flex flex-col">
              
              {/* O Cartão Virtual (Glassmorphism Premium) */}
              <div 
                  className="relative aspect-[1.58/1] w-full rounded-3xl p-6 sm:p-8 text-white overflow-hidden shadow-2xl group flex flex-col justify-between" 
                  style={{ background: `linear-gradient(135deg, ${cardThemeColor} 0%, #18181b 120%)` }}
              >
                  {/* Texturas e Brilhos Base */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')] opacity-10 mix-blend-overlay"></div>
                  <div className="absolute -top-[50%] -right-[20%] w-[100%] h-[100%] rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                  
                  {/* Topo do Cartão (Chip e Contactless) */}
                  <div className="flex justify-between items-start relative z-10">
                     <div className="w-11 sm:w-14 h-8 sm:h-10 rounded bg-gradient-to-br from-yellow-200/80 via-yellow-500/80 to-yellow-600/80 shadow-sm border border-yellow-200/20">
                         {/* Linhas falsas do chip */}
                         <div className="w-full h-full opacity-30 border border-black/20 rounded grid grid-cols-2 divide-x divide-y divide-black/20">
                            <div></div><div></div><div></div><div></div>
                         </div>
                     </div>
                     <Wifi size={24} className="rotate-90 opacity-60 text-white" strokeWidth={3}/>
                  </div>

                  {/* Informação Central/Fundo */}
                  <div className="relative z-10 mt-auto">
                     <div className="flex items-end justify-between">
                         <div>
                             <p className="text-[10px] text-white/60 font-medium uppercase tracking-widest mb-1 shadow-black">Cartão de Crédito</p>
                             <h2 className="text-xl sm:text-2xl font-bold tracking-widest uppercase drop-shadow-md truncate max-w-[200px]">{selectedCard?.name}</h2>
                         </div>
                         {/* Falsa Bandeira (Visa/Mastercard style) */}
                         <div className="flex items-center">
                            <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-red-500/80 mix-blend-screen -mr-3 sm:-mr-4"></div>
                            <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-amber-500/80 mix-blend-screen"></div>
                         </div>
                     </div>
                  </div>
              </div>

              {/* Datas Importantes */}
              <div className="grid grid-cols-2 gap-4 shrink-0">
                  <div className="card p-4 sm:p-5 flex flex-col items-center justify-center text-center border-white/5 bg-zinc-900/30">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Fechamento</p>
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Dia {selectedCard?.closing_day || '--'}</h3>
                  </div>
                  <div className="card p-4 sm:p-5 flex flex-col items-center justify-center text-center border-white/5 bg-zinc-900/30">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Vencimento</p>
                      <h3 className="text-xl sm:text-2xl font-bold text-indigo-400 tracking-tight">Dia {selectedCard?.due_day || '--'}</h3>
                  </div>
              </div>

              {/* Insights Dinâmicos */}
              <div className="flex-1 flex flex-col gap-3">
                 <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 px-1">Inteligência Financeira</h4>
                 <InsightBar 
                    type={Number(percentualUso) > 85 ? 'warning' : 'success'} 
                    text={Number(percentualUso) > 85 ? `Alerta: Está a usar ${percentualUso}% do limite. Risco alto de sobre-endividamento.` : `Saúde de crédito excelente. Utilização do limite em níveis seguros (${percentualUso}%).`} 
                 />
                 <InsightBar 
                    type="info" 
                    text={`Estratégia: Faça compras grandes logo após o dia ${selectedCard?.closing_day} para ter até 40 dias para pagar sem juros.`} 
                 />
              </div>

            </div>

            {/* =========================================================
                COLUNA DIREITA (66%) - ANALÍTICA E FATURA
            ========================================================= */}
            <div className="lg:col-span-8 space-y-6 sm:space-y-8 w-full overflow-hidden flex flex-col">
              
              {/* O GRANDE FOCO: Fatura Atual e Progressão do Limite */}
              <div className="card p-6 sm:p-8 bg-zinc-900/60 border-white/5 shadow-2xl relative overflow-hidden group">
                  {/* Glow effect baseado na cor de uso */}
                  <div className="absolute -top-[100px] -right-[50px] w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 pointer-events-none transition-colors duration-1000" style={{ backgroundColor: limitColorHex }}></div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
                     <div>
                        <p className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <DollarSign size={16}/> Fatura Atual
                        </p>
                        <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter">
                           {loading ? "..." : formatCurrency(totalFaturaAtual)}
                        </h3>
                     </div>
                     
                     <div className="text-left md:text-right w-full md:w-auto">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Limite Disponível</p>
                        <h4 className="text-2xl font-bold tracking-tight transition-colors duration-500" style={{ color: limitColorHex }}>
                            {formatCurrency(limiteDisponivel)}
                        </h4>
                        <p className="text-xs text-zinc-500 font-medium mt-1">de {formatCurrency(limiteTotal)} total</p>
                     </div>
                  </div>

                  {/* Super Barra de Progresso */}
                  <div className="mt-8 sm:mt-12 relative z-10">
                      <div className="flex justify-between items-end mb-2 px-1">
                          <span className="text-[10px] font-bold text-zinc-500">0%</span>
                          <span className="text-[11px] font-bold text-white bg-zinc-800 px-2 py-1 rounded-md border border-white/10 shadow-lg" style={{ transform: `translateX(${Number(percentualUso) < 10 ? '0' : Number(percentualUso) > 90 ? '0' : '-50%'})`, marginLeft: `${Number(percentualUso) > 10 && Number(percentualUso) < 90 ? percentualUso : '0'}%` }}>
                              {percentualUso}% Usado
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500">100%</span>
                      </div>
                      <div className="h-3 sm:h-4 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
                          {/* Marcações de Perigo */}
                          <div className="absolute left-[50%] top-0 h-full w-px bg-white/10 z-20"></div>
                          <div className="absolute left-[85%] top-0 h-full w-px bg-rose-500/50 z-20"></div>
                          
                          <div 
                              className="h-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(0,0,0,0.8)] relative z-10" 
                              style={{ width: `${percentualUso}%`, backgroundColor: limitColorHex }} 
                          />
                      </div>
                  </div>
              </div>

              {/* GRID INFERIOR: Evolução e Categorias */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 flex-1">
                  
                  {/* Gráfico 1: Evolução Histórica */}
                  <div className="card h-auto min-h-[350px] p-5 sm:p-6 flex flex-col bg-zinc-900/30 border-white/5">
                    <div className="flex items-center gap-2 mb-6 shrink-0">
                       <Activity size={16} className="text-zinc-400"/>
                       <h4 className="text-sm font-bold text-white uppercase tracking-wider">Histórico de Faturas</h4>
                    </div>
                    <div className="flex-1 w-full mt-2 min-h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolutionData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorEvol" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={cardThemeColor} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={cardThemeColor} stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} minTickGap={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(value) => `${value}`} />
                          <Tooltip 
                            cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 2 }}
                            contentStyle={{ borderRadius: '12px', background: 'rgba(24, 24, 27, 0.95)', backdropFilter: 'blur(8px)', border: '1px solid #3f3f46', color: '#fff', fontSize: '12px' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            formatter={(value: number) => [formatCurrency(value), 'Valor da Fatura']}
                          />
                          <Area type="monotone" dataKey="valor" stroke={cardThemeColor} strokeWidth={3} fill="url(#colorEvol)" activeDot={{ r: 5, fill: cardThemeColor, stroke: '#18181b', strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfico 2: Distribuição Atual */}
                  <div className="card h-auto min-h-[350px] p-5 sm:p-6 flex flex-col bg-zinc-900/30 border-white/5">
                    <div className="flex items-center gap-2 mb-4 shrink-0">
                       <PieIcon size={16} className="text-zinc-400"/>
                       <h4 className="text-sm font-bold text-white uppercase tracking-wider">Gastos por Categoria</h4>
                    </div>
                    
                    <div className="w-full h-[180px] shrink-0 relative mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={categoryData.length > 0 ? categoryData : [{ name: 'Nenhum', value: 1 }]} 
                            innerRadius="65%" 
                            outerRadius="90%" 
                            paddingAngle={3} 
                            dataKey="value"
                            stroke="none"
                          >
                            {categoryData.length > 0 ? (
                              categoryData.map((e, i) => <Cell key={i} fill={e.color} />)
                            ) : (
                              <Cell fill="#27272a" />
                            )}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', background: 'rgba(24, 24, 27, 0.95)', border: '1px solid #3f3f46', color: '#fff', fontSize: '11px', padding: '8px 12px' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            formatter={(value: number, name: any) => {
                              const percent = totalFaturaAtual > 0 ? ((value / totalFaturaAtual) * 100).toFixed(1) : "0";
                              return [`${percent}% (${formatCurrency(value)})`, name];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase">Total</span>
                          <span className="text-sm font-bold text-white">{formatCurrency(totalFaturaAtual)}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 mt-4 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                      {categoryData.length > 0 ? categoryData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 bg-black/20 p-2.5 rounded-lg border border-white/5">
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-zinc-300 font-medium truncate">{item.name}</span>
                          </div>
                          <span className="text-xs text-white font-bold whitespace-nowrap">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      )) : <p className="text-xs text-zinc-600 italic text-center mt-6">Nenhum gasto neste período.</p>}
                    </div>

                  </div>
              </div>

            </div>
          </div>
        </div>
        
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}