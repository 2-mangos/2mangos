'use client'

import { useState, useEffect } from 'react'
import { Bot, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'

interface AIInsightsCardProps {
  userPlan: string
}

export default function AIInsightsCard({ userPlan }: AIInsightsCardProps) {
  const isPremium = userPlan === 'premium'
  const [isLoading, setIsLoading] = useState(false)
  const [insights, setInsights] = useState<string[]>([])

  // Dispara a busca automaticamente ao carregar o componente, simulando o comportamento original
  useEffect(() => {
    async function fetchInsightsAutomated() {
      if (!isPremium || isLoading) return
      
      setIsLoading(true)
      try {
        const response = await fetch('/api/chat-insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // Pega mês/ano atual no servidor
        })

        if (!response.ok) throw new Error('Erro ao buscar insights')

        const data = await response.json()
        
        if (data && Array.isArray(data.insights)) {
          setInsights(data.insights)
        } else {
          setInsights(["Não foi possível estruturar as métricas da Bleu IA."])
        }
      } catch (error) {
        console.error("Erro automático na Bleu IA:", error)
        setInsights(["Erro ao conectar com o consultor financeiro.", "Verifique sua conexão ou tente mais tarde."])
      } finally {
        setIsLoading(false)
      }
    }

    fetchInsightsAutomated()
  }, [isPremium])

  // Helper para renderizar os ícones correspondentes aos grupos (Alertas, Ações, Elogios)
  const getInsightIcon = (index: number) => {
    if (index < 3) return <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
    if (index < 6) return <ArrowRight size={14} className="text-amber-400 shrink-0 mt-0.5" />
    return <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
  }

  return (
    <div className="card relative overflow-hidden group min-h-[250px] flex flex-col border border-indigo-500/20 bg-zinc-900/50 p-5 rounded-2xl">
      
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-transparent opacity-30 group-hover:opacity-60 transition-opacity duration-1000"></div>

      <div className="relative z-10 flex items-center justify-between mb-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Bot size={20} />
          </div>
          <div>
             <h3 className="font-bold text-white text-base">Consultor Inteligente</h3>
             <p className="text-xs text-zinc-500">Análise profunda do mês</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center">
        {!isPremium ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-4 py-8 my-auto">
            <p className="text-xs text-zinc-500 max-w-[200px]">
              Libere análises detalhadas da sua saúde financeira com IA.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-500 italic text-xs py-12">
            <Bot size={20} className="animate-bounce text-indigo-400" />
            <span className="animate-pulse">Atualizando insights...</span>
          </div>
        ) : (
          /* Renderiza os blocos/barras de insights de forma limpa abaixo do cabeçalho */
          <div className="space-y-2.5 animate-in fade-in duration-500 max-h-[320px] overflow-y-auto p-1 custom-scrollbar">
            {insights.length > 0 ? (
              insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className="flex gap-2.5 items-start bg-zinc-800/30 border border-zinc-800/60 p-3 rounded-xl hover:bg-zinc-800/60 transition-colors"
                >
                  {getInsightIcon(idx)}
                  <p className="text-zinc-200 text-xs leading-relaxed font-medium">{insight}</p>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-xs italic text-center">Nenhum insight gerado para este período.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}