'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { 
  X, Trash2, Check, CreditCard, Tag, Calendar, 
  LayoutGrid, ArrowRight, History, DollarSign, AlertCircle, Plus
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { useToast } from './ToastContext'
import { useRouter } from 'next/navigation'

interface CreditCardModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  expenseName: string
  onUpdateTotal: () => void
}

export default function CreditCardModal({ isOpen, onClose, expenseId, expenseName, onUpdateTotal }: CreditCardModalProps) {
  const { addToast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  
  // Estados de UI e Form
  const [items, setItems] = useState<any[]>([])
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('Outros')
  const [isInstallment, setIsInstallment] = useState(false)
  const [installments, setInstallments] = useState('2')
  const [loading, setLoading] = useState(false)
  const [totalInvoice, setTotalInvoice] = useState(0)
  const [activeTab, setActiveTab] = useState<'lancamento' | 'historico'>('lancamento')

  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; item: any }>({ show: false, item: null })

  const categories = [ "Alimentação", "Lazer", "Mercado", "Transporte", "Saúde", "Educação", "Serviços", "Compras", "Viagem", "Outros" ]

  const syncAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: transactions, error } = await supabase
      .from('card_transactions')
      .select('*')
      .eq('expense_id', expenseId)
      .order('transaction_date', { ascending: false })

    if (error) { addToast("Erro ao sincronizar dados", "error"); return }

    const list = transactions || []
    const newTotal = list.reduce((acc, curr) => acc + Number(curr.amount), 0)

    await supabase.from('expenses').update({ value: newTotal }).eq('id', expenseId)

    setItems(list)
    setTotalInvoice(newTotal)
    onUpdateTotal()
    router.refresh()
  }

  useEffect(() => {
    if (isOpen && expenseId) syncAndFetch()
  }, [isOpen, expenseId])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) { addToast("Sessão expirada", "error"); setLoading(false); return }

    try {
      const cleanAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
      if (isNaN(cleanAmount)) throw new Error("Valor inválido")

      const { error } = await supabase.rpc('create_card_transaction_manual', {
        p_user_id: user.id,
        p_card_name: expenseName,
        p_description: desc,
        p_amount: cleanAmount,
        p_date: date, 
        p_category: category,
        p_installments: isInstallment ? parseInt(installments) : 1
      })

      if (error) throw error
      
      addToast("Lançamento confirmado!", 'success')
      setDesc(''); setAmount(''); setIsInstallment(false); setInstallments('2')
      await syncAndFetch()
      
    } catch (err: any) {
      addToast("Falha ao salvar: " + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = (item: any) => {
    if (item.installments_total && Number(item.installments_total) > 1) {
      setDeleteConfirm({ show: true, item });
    } else {
      if (confirm("Remover este lançamento?")) {
        executeDeletion(item.id, false);
      }
    }
  }

  const executeDeletion = async (idOrItem: any, isBulk: boolean) => {
    setLoading(true);
    try {
      let query = supabase.from('card_transactions').delete();
      
      if (isBulk) {
        query = query.eq('description', idOrItem.description).eq('installments_total', idOrItem.installments_total);
      } else {
        query = query.eq('id', idOrItem);
      }

      const { error } = await query;
      if (error) throw error;

      addToast(isBulk ? "Parcelamento removido!" : "Lançamento removido!", "success");
      setDeleteConfirm({ show: false, item: null });
      await syncAndFetch();
    } catch (err: any) {
      addToast("Erro ao remover", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#18181b] rounded-3xl border border-white/10 shadow-2xl flex flex-col h-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-in zoom-in-95">
        
        {/* HEADER */}
        <div className="p-6 sm:p-8 border-b border-white/5 bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{expenseName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Fatura Sincronizada</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-6 relative z-10">
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Total Aberto</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{formatCurrency(totalInvoice)}</h3>
            </div>
            <button onClick={onClose} className="p-2.5 bg-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
              <X size={20}/>
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO / TABS */}
        <div className="flex px-6 sm:px-8 border-b border-white/5 bg-zinc-950/50 shrink-0 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('lancamento')} className={`px-4 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'lancamento' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              <Plus size={14}/> Nova Compra
            </button>
            <button onClick={() => setActiveTab('historico')} className={`px-4 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'historico' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              <History size={14}/> Detalhes da Fatura ({items.length})
            </button>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar relative">
          {activeTab === 'lancamento' ? (
            <div className="w-full max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-2">
                <form onSubmit={handleAddItem} className="space-y-6">
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 tracking-wider">Descrição na Fatura</label>
                        <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input type="text" placeholder="Ex: Mercado Livre, Uber..." value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 p-3.5 pl-11 rounded-xl text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition-colors shadow-sm" required />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 tracking-wider">Valor Cobrado</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input type="text" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 p-3.5 pl-11 rounded-xl text-white font-bold outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition-colors shadow-sm" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 tracking-wider">Data da Compra</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 p-3.5 pl-11 rounded-xl text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition-colors shadow-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 tracking-wider">Categoria</label>
                        <div className="relative">
                            <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 p-3.5 pl-11 rounded-xl text-white outline-none appearance-none cursor-pointer text-sm focus:ring-1 focus:ring-indigo-500 transition-colors shadow-sm">
                                {categories.map(cat => <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Bloco de Parcelamento Embutido */}
                    <div className="p-5 bg-zinc-900/30 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div onClick={() => setIsInstallment(!isInstallment)} className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${isInstallment ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600 bg-zinc-900/80 hover:bg-zinc-800'}`}>
                                {isInstallment && <Check size={12} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Lançamento Parcelado?</span>
                        </div>
                        {isInstallment && (
                            <div className="flex items-center gap-2 bg-zinc-950 p-1.5 px-3 rounded-lg border border-white/10 animate-in fade-in slide-in-from-right-2">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Qtd Parcelas:</span>
                                <input type="number" min="2" max="72" value={installments} onChange={e => setInstallments(e.target.value)} className="w-12 bg-transparent text-white font-bold text-center outline-none text-sm" />
                            </div>
                        )}
                    </div>

                    <button disabled={loading} className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-[0.98]">
                      {loading ? 'Processando Lançamento...' : <>{'Processar no Cartão'} <ArrowRight size={16}/></>}
                    </button>
                </form>
            </div>
          ) : (
            <div className="w-full max-w-3xl mx-auto space-y-3 animate-in slide-in-from-bottom-2 pb-10">
                {items.length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-white/10 bg-zinc-900/20 rounded-2xl flex flex-col items-center gap-3">
                        <History size={32} className="text-zinc-600"/>
                        <p className="text-zinc-500 text-sm font-medium">Nenhum gasto faturado encontrado.</p>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="group p-4 bg-zinc-900/30 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/30 transition-all hover:bg-zinc-900/60">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-zinc-950/80 rounded-xl flex flex-col items-center justify-center border border-white/5 shadow-inner shrink-0">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase">{new Date(item.transaction_date).toLocaleString('pt-BR', {month: 'short'})}</span>
                                    <span className="text-sm font-bold text-white">{new Date(item.transaction_date).getUTCDate()}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-zinc-100 tracking-tight truncate flex items-center flex-wrap gap-1">
                                        {item.description}
                                        {item.installments_total > 1 && (
                                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 whitespace-nowrap">
                                                {item.installment_number}/{item.installments_total}
                                            </span>
                                        )}
                                    </p>
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider inline-block mt-1">{item.category}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-16 sm:pl-0">
                                <span className="text-sm font-bold text-white">{formatCurrency(item.amount)}</span>
                                <button onClick={() => handleDeleteItem(item)} className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
          )}
        </div>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (Sobreposto) */}
        {deleteConfirm.show && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
            <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col relative">
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500">
                  <AlertCircle size={28} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Excluir Lançamento</h3>
              <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
                Este item faz parte de uma compra parcelada em <strong className="text-white">{deleteConfirm.item.installments_total}x</strong>. Como deseja prosseguir?
              </p>
              
              <div className="space-y-2.5">
                <button onClick={() => executeDeletion(deleteConfirm.item.id, false)} className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all border border-white/5 hover:border-white/10">
                  Excluir apenas esta parcela
                </button>
                <button onClick={() => executeDeletion(deleteConfirm.item, true)} className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-900/20">
                  Excluir todas as parcelas
                </button>
                <button onClick={() => setDeleteConfirm({ show: false, item: null })} className="w-full py-3 bg-transparent text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-all mt-2">
                  Cancelar Operação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}