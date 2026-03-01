'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { 
  X, Trash2, Check, CreditCard, Tag, Calendar, 
  LayoutGrid, ArrowRight, History, DollarSign, AlertCircle
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

  // Estado para o Modal de Aviso de Exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; item: any }>({ 
    show: false, 
    item: null 
  });

  const categories = [
    "Alimentação", "Lazer", "Mercado", "Transporte", "Saúde", 
    "Educação", "Serviços", "Compras", "Viagem", "Outros"
  ]

  // Sincroniza o total da fatura com o banco e atualiza a lista
  const syncAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: transactions, error } = await supabase
      .from('card_transactions')
      .select('*')
      .eq('expense_id', expenseId)
      .order('transaction_date', { ascending: false })

    if (error) {
      addToast("Erro ao sincronizar dados", "error")
      return
    }

    const list = transactions || []
    const newTotal = list.reduce((acc, curr) => acc + Number(curr.amount), 0)

    // Atualiza o valor da despesa (fatura) pai no banco de dados
    await supabase.from('expenses').update({ value: newTotal }).eq('id', expenseId)

    setItems(list)
    setTotalInvoice(newTotal)
    onUpdateTotal()
    router.refresh()
  }

  useEffect(() => {
    if (isOpen && expenseId) {
      syncAndFetch()
    }
  }, [isOpen, expenseId])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        addToast("Sessão expirada", "error")
        setLoading(false)
        return
    }

    try {
      // CORREÇÃO: Limpeza robusta do valor para o PostgreSQL
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
        query = query
          .eq('description', idOrItem.description)
          .eq('installments_total', idOrItem.installments_total);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl bg-zinc-950 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-8 border-b border-white/5 bg-zinc-900/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-600/10 rounded-[1.25rem] border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <CreditCard size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{expenseName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.2em]">Fatura em Aberto</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Consolidado</p>
              <h3 className="text-3xl font-black text-white">{formatCurrency(totalInvoice)}</h3>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-all border border-transparent hover:border-white/10">
              <X size={24}/>
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO / TABS */}
        <div className="flex px-8 border-b border-white/5 bg-zinc-900/10">
            <button onClick={() => setActiveTab('lancamento')} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'lancamento' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              Novo Lançamento
            </button>
            <button onClick={() => setActiveTab('historico')} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'historico' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              Itens da Fatura ({items.length})
            </button>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'lancamento' ? (
            <div className="w-full max-w-3xl mx-auto">
                <form onSubmit={handleAddItem} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-widest">Descrição</label>
                            <div className="relative">
                                <Tag className="absolute left-4 top-4 text-zinc-600" size={18} />
                                <input type="text" placeholder="Ex: Amazon" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 p-4 pl-12 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-widest">Valor</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-4 text-zinc-600" size={18} />
                                <input type="text" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 p-4 pl-12 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/50" required />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-widest">Categoria</label>
                            <div className="relative">
                                <LayoutGrid className="absolute left-4 top-4 text-zinc-600" size={18} />
                                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 p-4 pl-12 rounded-2xl text-white outline-none appearance-none">
                                    {categories.map(cat => <option key={cat} value={cat} className="bg-zinc-950">{cat}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-widest">Data</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-4 text-zinc-600" size={18} />
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 p-4 pl-12 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-zinc-900/30 rounded-3xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div onClick={() => setIsInstallment(!isInstallment)} className={`w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${isInstallment ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-700 bg-zinc-950'}`}>
                                {isInstallment && <Check size={14} className="text-white" />}
                            </div>
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Compra Parcelada?</span>
                        </div>
                        {isInstallment && (
                            <div className="flex items-center gap-3 bg-zinc-950 p-2 px-4 rounded-xl border border-white/5">
                                <span className="text-[10px] font-black text-zinc-600 uppercase">Vezes:</span>
                                <input type="number" min="2" value={installments} onChange={e => setInstallments(e.target.value)} className="w-12 bg-transparent text-white font-bold text-center outline-none" />
                            </div>
                        )}
                    </div>

                    <button disabled={loading} className="w-full py-5 bg-indigo-600 hover:bg-indigo-50 text-white rounded-[2rem] font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-indigo-900/20 active:scale-[0.98]">
                      {loading ? 'Processando...' : <>{'Confirmar Lançamento'} <ArrowRight size={18}/></>}
                    </button>
                </form>
            </div>
          ) : (
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2 mb-4">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <History size={14} /> Detalhamento de Itens
                    </h3>
                </div>
                {items.length === 0 ? (
                    <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                        <p className="text-zinc-600 text-sm italic">Nenhum gasto registrado nesta fatura.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {items.map(item => (
                            <div key={item.id} className="group p-5 bg-zinc-900/30 border border-white/5 rounded-3xl flex items-center justify-between hover:border-indigo-500/30 transition-all">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex flex-col items-center justify-center border border-white/5">
                                        <span className="text-[9px] font-black text-indigo-500 uppercase">{new Date(item.transaction_date).toLocaleString('pt-BR', {month: 'short'})}</span>
                                        <span className="text-sm font-bold text-white">{new Date(item.transaction_date).getUTCDate()}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white tracking-tight">
                                            {item.description}
                                            {item.installments_total > 1 && (
                                                <span className="ml-2 text-[10px] text-indigo-400 font-black tracking-tighter">
                                                    ({item.installment_number}/{item.installments_total})
                                                </span>
                                            )}
                                        </p>
                                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{item.category}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="text-sm font-black text-white">{formatCurrency(item.amount)}</span>
                                    <button onClick={() => handleDeleteItem(item)} className="p-2 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}
        </div>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (AVISO) */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
            <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
                  <AlertCircle size={32} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Excluir Lançamento</h3>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                Este item faz parte de uma compra em {deleteConfirm.item.installments_total}x. Como deseja prosseguir?
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => executeDeletion(deleteConfirm.item.id, false)}
                  className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-xs font-bold uppercase tracking-widest border border-white/5 transition-all"
                >
                  Excluir apenas esta parcela
                </button>
                <button 
                  onClick={() => executeDeletion(deleteConfirm.item, true)}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-rose-900/20"
                >
                  Excluir todo o parcelamento
                </button>
                <button 
                  onClick={() => setDeleteConfirm({ show: false, item: null })}
                  className="w-full py-4 bg-transparent text-zinc-500 hover:text-zinc-300 text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-8 border-t border-white/5 bg-zinc-950 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Sincronizado via Supabase</p>
            </div>
            <span className="text-[10px] text-zinc-700 font-medium tracking-tight">V 2.7.5</span>
        </div>
      </div>
    </div>
  )
}