'use client'

import { useState } from 'react'
import { Account, Expense } from '@/lib/types'
import { 
  CreditCard, 
  Settings2, 
  Check, 
  X, 
  ReceiptText, 
  Calendar, 
  Info,
  CreditCard as CardIcon
} from 'lucide-react'
import { updateCardSettings, getCardInvoiceData } from '@/app/actions/cards'
import { useToast } from '@/components/ToastContext'

interface CardsClientProps {
  initialAccounts: Account[]
}

export default function CardsClient({ initialAccounts }: CardsClientProps) {
  const { addToast } = useToast()
  
  // Estados de Edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Account>>({})
  
  // Estados do Modal de Fatura
  const [selectedInvoice, setSelectedInvoice] = useState<{name: string, items: Expense[], period: string} | null>(null)
  const [isSearching, setIsSearching] = useState<string | null>(null)

  const handleEditClick = (card: Account) => {
    setEditData({
      credit_limit: card.credit_limit || 0,
      closing_day: (card as any).closing_day || 0,
      due_day: (card as any).due_day || 0
    })
    setEditingId(card.id)
  }

  const handleSave = async (id: string) => {
    try {
      await updateCardSettings(id, {
        credit_limit: Number(editData.credit_limit),
        closing_day: Number(editData.closing_day),
        due_day: Number(editData.due_day),
      })
      addToast('Configurações salvas!', 'success')
      setEditingId(null)
    } catch (err) {
      addToast('Erro ao atualizar.', 'error')
    }
  }

  const handleViewInvoice = async (card: Account) => {
    const closingDay = (card as any).closing_day
    if (!closingDay) {
      addToast('Configure o dia de fechamento primeiro.', 'error')
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {initialAccounts.map((card) => (
        <div key={card.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative min-h-[250px] flex flex-col justify-between">
          
          {editingId !== card.id && (
            <button 
              onClick={() => handleEditClick(card)} 
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white z-10"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
                <CardIcon className="w-5 h-5" />
              </div>
              <span className="font-semibold text-zinc-100">{card.name}</span>
            </div>

            {editingId === card.id ? (
              <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Limite (R$)</label>
                    <input 
                      type="number" 
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                      value={editData.credit_limit} 
                      onChange={e => setEditData({...editData, credit_limit: Number(e.target.value)})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Fechamento</label>
                    <input 
                      type="number" 
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={editData.closing_day} 
                      onChange={e => setEditData({...editData, closing_day: Number(e.target.value)})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Vencimento</label>
                    <input 
                      type="number" 
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={editData.due_day} 
                      onChange={e => setEditData({...editData, due_day: Number(e.target.value)})} 
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSave(card.id)} className="flex-1 bg-blue-600 text-white text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" /> Salvar
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-zinc-800 text-zinc-400 text-xs py-2 rounded-lg font-bold">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
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

                <div className="grid grid-cols-2 gap-4 text-xs border-t border-zinc-800 pt-3">
                  <div>
                    <span className="text-zinc-500 block font-medium">Fechamento</span>
                    <span className="text-zinc-100">Dia {(card as any).closing_day || '--'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 block font-medium">Vencimento</span>
                    <span className="text-zinc-100">Dia {(card as any).due_day || '--'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!editingId && (
            <button 
              onClick={() => handleViewInvoice(card)}
              disabled={isSearching === card.id}
              className="w-full mt-6 flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition-all disabled:opacity-50"
            >
              {isSearching === card.id ? 'Buscando...' : 'Ver Itens da Fatura'}
              <ReceiptText className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}

      {/* MODAL DE ITENS DA FATURA */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-xl text-white">Fatura: {selectedInvoice.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-blue-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Período: {selectedInvoice.period}</span>
                </div>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[50vh] overflow-y-auto space-y-3">
              {selectedInvoice.items.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-zinc-500">
                  <Info className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">Nenhum lançamento nesta fatura.</p>
                </div>
              ) : (
                selectedInvoice.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-100">{item.name}</span>
                      <span className="text-[11px] text-zinc-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-white">
                      R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-sm text-zinc-400 font-medium">Total Acumulado</span>
              <span className="text-2xl font-black text-white">
                R$ {selectedInvoice.items.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}