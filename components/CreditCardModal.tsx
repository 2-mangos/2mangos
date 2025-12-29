'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'
import { X, Plus, Trash2, MoreVertical, Edit2, Save, Layers, FileUp, History, Check } from 'lucide-react'
import { CardTransaction } from '../lib/types'
import { formatCurrency, formatDate } from '../lib/utils'
import { useToast } from './ToastContext'

const CATEGORIES = [
  { name: 'Alimentação', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { name: 'Transporte', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { name: 'Lazer', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { name: 'Mercado', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { name: 'Serviços', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  { name: 'Compras', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { name: 'Saúde', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { name: 'Outros', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
]

interface CreditCardModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  expenseName: string
  onUpdateTotal: () => void
}

export default function CreditCardModal({ isOpen, onClose, expenseId, expenseName, onUpdateTotal }: CreditCardModalProps) {
  const { addToast } = useToast()
  const supabase = createClient()
  
  const [items, setItems] = useState<CardTransaction[]>([])
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState(CATEGORIES[0].name)
  const [isInstallment, setIsInstallment] = useState(false)
  const [installments, setInstallments] = useState('2')
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  // Sugestões (Histórico)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const filteredSuggestions = items.filter((v, i, a) => a.findIndex(t => t.description === v.description) === i)
    .filter(item => item.description.toLowerCase().includes(desc.toLowerCase()) && desc.length > 1)

  useEffect(() => {
    if (isOpen && expenseId) fetchItems()
  }, [isOpen, expenseId])

  async function fetchItems() {
    const { data } = await supabase.from('card_transactions').select('*').eq('expense_id', expenseId).order('created_at', { ascending: false })
    if (data) {
      setItems(data as CardTransaction[])
      setTotal(data.reduce((acc, curr) => acc + curr.amount, 0))
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return

    try {
        const inputVal = parseFloat(amount.replace(',', '.'))
        const numInstallments = isInstallment ? parseInt(installments) : 1

        const { error } = await supabase.rpc('create_card_transaction_installments', {
            p_user_id: user.id,
            p_card_name: expenseName,
            p_description: desc,
            p_amount: inputVal,
            p_date: date,
            p_category: category,
            p_installments: numInstallments
        })

        if (error) throw error
        setDesc(''); setAmount(''); setIsInstallment(false)
        addToast("Gasto adicionado!", 'success')
        fetchItems()
        onUpdateTotal()
    } catch (error: any) {
        addToast('Erro: ' + error.message, 'error')
    } finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl bg-zinc-950 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">{expenseName}</h2>
            <p className="text-sm text-zinc-500 mt-1">Gestão detalhada e importação de fatura</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Total da Fatura</span>
                <span className="text-2xl font-bold text-white">{formatCurrency(total)}</span>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-r border-white/5">
            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Descrição</label>
                  <input 
                    type="text" value={desc} 
                    onChange={e => {setDesc(e.target.value); setShowSuggestions(true)}}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="" required
                  />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                      {filteredSuggestions.map((s, i) => (
                        <button key={i} type="button" 
                          onClick={() => { setDesc(s.description); setCategory(s.category); setShowSuggestions(false) }}
                          className="w-full flex items-center gap-3 p-4 hover:bg-white/5 text-left border-b border-white/5 last:border-0"
                        >
                          <History size={14} className="text-indigo-400" />
                          <span className="text-sm text-zinc-300">{s.description}</span>
                          <span className="text-[10px] text-zinc-600 ml-auto uppercase">{s.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Valor Total</label>
                  <input 
                    type="text" value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-bold"
                    placeholder="" required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Categoria</label>
                  <select 
                    value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Data da Compra</label>
                  <input 
                    type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsInstallment(!isInstallment)}>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isInstallment ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-700'}`}>
                            {isInstallment && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Esta compra é parcelada?</span>
                    </div>
                    {isInstallment && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <span className="text-xs text-zinc-500 font-bold uppercase">Quantidade:</span>
                            <input type="number" min="2" max="48" value={installments} onChange={e => setInstallments(e.target.value)} className="w-16 bg-zinc-950 border border-white/10 rounded-lg p-2 text-center text-white" />
                        </div>
                    )}
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
                {loading ? 'Processando...' : 'Adicionar à Fatura'}
              </button>
            </form>

            <div className="mt-10 space-y-3">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Lançamentos Recentes</h4>
                {items.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: CATEGORIES.find(c => c.name === item.category)?.color.split(' ')[1] || '#fff'}} />
                            <div>
                                <p className="text-sm font-medium text-white">{item.description}</p>
                                <p className="text-[10px] text-zinc-600 uppercase font-bold">{formatDate(item.created_at)} • {item.category}</p>
                            </div>
                        </div>
                        <span className="text-sm font-bold text-white">{formatCurrency(item.amount)}</span>
                    </div>
                ))}
            </div>
          </div>

          <div className="w-full md:w-80 bg-zinc-900/20 p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <FileUp size={16} /> Importar Arquivo
              </h3>
              <div className="border-2 border-dashed border-white/5 rounded-[2rem] p-8 flex flex-col items-center text-center group hover:border-indigo-500/30 transition-all cursor-pointer bg-zinc-900/50">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 text-indigo-400">
                    <FileUp size={24} />
                </div>
                <p className="text-xs font-bold text-zinc-300 uppercase tracking-tighter">Arraste seu extrato</p>
                <p className="text-[10px] text-zinc-600 mt-2">Suporta .CSV ou .OFX</p>
              </div>

              <div className="mt-8 space-y-4">
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                        "O sistema aprende com seus lançamentos manuais para categorizar automaticamente suas importações."
                    </p>
                 </div>
              </div>
            </div>

            <div className="text-center">
                <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">Secure Cloud Storage</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}