'use client'

import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, RefreshCw, Zap } from 'lucide-react'

export default function AIFlashTips({ userPlan, month, year }: { userPlan: string, month: number, year: number }) {
  const [tips, setTips] = useState<string[]>([])
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  async function fetchInsights() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/chat-insights', { 
        method: 'POST',
        body: JSON.stringify({ month, year }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await res.json()
      
      if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
        setTips(data.insights)
      } else {
        throw new Error("Formato inválido ou vazio")
      }
    } catch (error) {
      console.error("Falha ao carregar insights", error)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [month, year])

  // Lógica de Rotação (15s)
  useEffect(() => {
    if (tips.length === 0) return;
    
    const interval = setInterval(() => {
      setVisibleStartIndex((prev) => {
        const nextIndex = prev + 3;
        return nextIndex >= tips.length ? 0 : nextIndex;
      });
    }, 15000);
    
    return () => clearInterval(interval);
  }, [tips]);

  // --- SKELETON UI (Melhora a percepção de velocidade) ---
  if (loading) {
    return (
      <div className="w-full bg-zinc-900/20 border border-white/5 rounded-xl p-4 h-[180px] flex flex-col justify-between">
         {/* Header Skeleton */}
         <div className="flex items-center gap-2 mb-3">
             <div className="w-4 h-4 rounded bg-zinc-800 animate-pulse"></div>
             <div className="w-20 h-3 rounded bg-zinc-800 animate-pulse"></div>
         </div>
         
         {/* Cards Skeleton */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-900/40 border border-white/5 p-3 rounded-lg h-20 animate-pulse flex flex-col justify-center gap-2">
                   <div className="w-3/4 h-2 rounded bg-zinc-800"></div>
                   <div className="w-1/2 h-2 rounded bg-zinc-800"></div>
                </div>
            ))}
         </div>

         {/* Dots Skeleton */}
         <div className="flex justify-center gap-1.5 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse"></div>
         </div>
      </div>
    )
  }

  // Tratamento de Erro
  if (error || tips.length === 0) {
      return (
        <div className="w-full bg-zinc-900/20 border border-white/5 rounded-xl p-4 flex items-center justify-between gap-3 group min-h-[140px]">
             <div className="flex items-center gap-3">
                <div className="bg-yellow-500/10 text-yellow-500 p-2 rounded-lg">
                    <AlertTriangle size={16} />
                </div>
                <div>
                    <p className="text-xs text-zinc-400 font-medium">Sem dados para análise.</p>
                    <p className="text-[10px] text-zinc-600">Onda IA precisa de mais movimentações.</p>
                </div>
             </div>
             <button onClick={fetchInsights} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                <RefreshCw size={14} />
             </button>
        </div>
      )
  }

  const visibleTips = tips.slice(visibleStartIndex, visibleStartIndex + 3);
  const totalPages = Math.ceil(tips.length / 3);
  const currentPage = Math.floor(visibleStartIndex / 3);

  return (
    <div className="w-full bg-gradient-to-r from-indigo-900/10 to-purple-900/10 border border-indigo-500/10 rounded-xl p-4 relative overflow-hidden group min-h-[180px] flex flex-col justify-between transition-all duration-500">
      
      {/* HEADER */}
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-indigo-400 fill-indigo-400/20" /> {/* Ícone mais "Onda" */}
        <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Onda IA</h3>
        
        <div className="ml-auto flex items-center gap-2">
            <button onClick={fetchInsights} className="text-zinc-500 hover:text-indigo-400 transition-colors" title="Gerar novos insights">
                <RefreshCw size={12} />
            </button>
        </div>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {visibleTips.map((tip, idx) => (
          <div 
            key={`${visibleStartIndex}-${idx}`} 
            className="bg-zinc-900/60 border border-white/5 p-3 rounded-lg flex items-center shadow-sm hover:border-indigo-500/20 transition-colors animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-forwards"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              {tip}
            </p>
          </div>
        ))}
      </div>

      {/* PAGINAÇÃO (BOLINHAS) */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
         {Array.from({ length: totalPages }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-500 ease-in-out ${
                 idx === currentPage 
                   ? 'w-6 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                   : 'w-1.5 bg-zinc-700/50'
              }`}
            ></div>
         ))}
      </div>

    </div>
  )
}