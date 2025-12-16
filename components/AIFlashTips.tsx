'use client'

import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle } from 'lucide-react'

export default function AIFlashTips({ userPlan }: { userPlan: string }) {
  const [tips, setTips] = useState<string[]>([])
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch('/api/chat-insights', { method: 'POST' })
        const data = await res.json()
        if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
          setTips(data.insights)
          setError(false)
        } else {
            // Se vier vazio ou sem formato correto, consideramos erro
            throw new Error("Formato inválido")
        }
      } catch (error) {
        console.error("Falha ao carregar insights", error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])

  // Lógica de Rotação
  useEffect(() => {
    if (tips.length === 0) return;
    const interval = setInterval(() => {
      setVisibleStartIndex((prev) => {
        const nextIndex = prev + 3;
        return nextIndex >= tips.length ? 0 : nextIndex;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [tips]);

  if (loading) {
    return (
      <div className="w-full bg-zinc-900/50 border border-white/5 rounded-xl p-4 h-24 flex items-center justify-center gap-2">
         <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-indigo-500"></div>
         <span className="text-xs text-zinc-500">Consultando Bleu IA...</span>
      </div>
    )
  }

  // Se der erro, mostramos um placeholder amigável em vez de sumir
  if (error || tips.length === 0) {
      return (
        <div className="w-full bg-zinc-900/20 border border-white/5 rounded-xl p-4 flex items-center gap-3">
             <div className="bg-yellow-500/10 text-yellow-500 p-2 rounded-lg">
                <AlertTriangle size={16} />
             </div>
             <div>
                <p className="text-xs text-zinc-400 font-medium">Não foi possível gerar insights agora.</p>
                <p className="text-[10px] text-zinc-600">Verifique se você criou a tabela de cache no Supabase.</p>
             </div>
        </div>
      )
  }

  const visibleTips = tips.slice(visibleStartIndex, visibleStartIndex + 3);

  return (
    <div className="w-full bg-gradient-to-r from-indigo-900/10 to-purple-900/10 border border-indigo-500/10 rounded-xl p-4 relative overflow-hidden group">
      
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-indigo-400" />
        <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Bleu Insights</h3>
        <span className="ml-auto text-[9px] text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
           Dica {visibleStartIndex + 1}-{Math.min(visibleStartIndex + 3, tips.length)} de {tips.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {visibleTips.map((tip, idx) => (
          <div 
            key={`${visibleStartIndex}-${idx}`} 
            className="bg-zinc-900/60 border border-white/5 p-3 rounded-lg animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-forwards"
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              {tip}
            </p>
          </div>
        ))}
      </div>
      
      <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500/20 w-full">
         <div className="h-full bg-indigo-500/50 transition-all duration-[8000ms] ease-linear w-full origin-left animate-progress"></div>
      </div>
    </div>
  )
}