'use client'

import { useState } from 'react'
import { Account, Expense } from '@/lib/types'
import { 
  ReceiptText, 
  Calendar, 
  Info,
  CreditCard as CardIcon,
  X,
  Lock
} from 'lucide-react'
import { getCardInvoiceData } from '@/app/actions/cards'
import { useToast } from '@/components/ToastContext'
import UpgradeModal from '@/components/UpgradeModal'

interface CardsClientProps {
  initialAccounts: Account[]
  userPlan: 'free' | 'premium'
}

export default function CardsClient({ initialAccounts, userPlan }: CardsClientProps) {
  const { addToast } = useToast()
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<{name: string, items: Expense[], period: string} | null>(null)
  const [isSearching, setIsSearching] = useState<string | null>(null)

  // Normalização rigorosa: apenas bloqueia se o plano for 'free'
  // Se for 'premium' ou qualquer outra coisa, o bloqueio não aparece
  const isFree = userPlan?.toLowerCase() === 'free'

  const handleViewInvoice = async (card: Account) => {
    if (isFree) {
      setIsUpgradeModalOpen(true)
      return
    }

    const closingDay = (card as any).closing_day
    if (!closingDay) {
      addToast('Configure o dia de fechamento na tela de Categorias.', 'error')
      return
    }

    setIsSearching(card.id)
    try {
      const data = await getCardInvoiceData(card.name, Number(closingDay))
      setSelectedInvoice({
        name: card.name,
        items: data.items,
        period: data.period
      })
    } catch (err) {
      addToast('Erro ao carregar itens.', 'error')
    } finally {
      setIsSearching(null)
    }
  }

  return (
    <div className="relative min-h-[400px]">
      {/* O Grid só fica desfocado se isFree for verdadeiro */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 ${isFree ? 'blur-[4px] pointer-events-none opacity-40 select-none' : ''}`}>
        {initialAccounts.map((card) => (
          <div key={card.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative min-h-[200px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
                  <CardIcon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-zinc-100">{card.name}</span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-zinc-500 text-xs">Melhor dia de compra</p>
                    <p className="text-blue-400 font-bold">Dia {(card as any).closing_day || '--'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-500 text-xs">Limite</p>
                    <p className="text-zinc-200 font-medium text-sm">R$ {card.credit_limit?.toLocaleString('pt-BR') || '0,00'}</p>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleViewInvoice(card)}
              disabled={isSearching === card.id}
              className="w-full mt-6 flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition-all"
            >
              Ver Itens da Fatura
              <ReceiptText className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* O Overlay só aparece se isFree for verdadeiro */}
      {isFree && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 bg-black/10 rounded-3xl">
          <div className="bg-indigo-600/20 p-5 rounded-full mb-4 ring-1 ring-indigo-500/30">
            <Lock className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Funcionalidade Premium</h2>
          <p className="text-zinc-400 text-sm max-w-sm mb-8">
            A gestão detalhada de faturas é exclusiva para membros <span className="text-indigo-400 font-bold">Premium</span>.
          </p>
          <button 
            onClick={() => setIsUpgradeModalOpen(true)}
            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 shadow-xl active:scale-95 transition-all"
          >
            Fazer Upgrade Agora
          </button>
        </div>
      )}

      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />

      {/* MODAL DE FATURA (Mantido) */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           {/* ... conteúdo do modal já existente ... */}
           <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
                <h3 className="font-bold text-xl text-white">Fatura: {selectedInvoice.name}</h3>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 bg-zinc-800 rounded-full text-zinc-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {selectedInvoice.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-4 mb-2 rounded-2xl bg-zinc-950 border border-zinc-800">
                    <span className="text-white font-bold text-sm">{item.name}</span>
                    <span className="text-white font-mono">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}
    </div>
  )
}