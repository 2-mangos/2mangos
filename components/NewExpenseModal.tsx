'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { X, AlertCircle, TrendingDown, RefreshCcw } from 'lucide-react'
import { Account, CreateExpenseDTO } from '../lib/types'
import { useToast } from './ToastContext'

interface NewExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateExpenseDTO & { recurrence_months?: number }) => Promise<void>
}

export default function NewExpenseModal({ isOpen, onClose, onSave }: NewExpenseModalProps) {
  const { addToast } = useToast()
  const supabase = createClient()
  
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreditCard, setIsCreditCard] = useState(false)
  
  const [formData, setFormData] = useState({
    value: '',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    type: 'variavel' as 'fixa' | 'variavel',
    status: 'pendente' as 'pago' | 'pendente',
    recurrence_months: 12,
    is_fixed_value: true
  })

  useEffect(() => {
    if (isOpen) {
      fetchAccounts()
    }
  }, [isOpen])

  async function fetchAccounts() {
    const { data } = await supabase.from('accounts').select('*').order('name')
    if (data) setAccounts(data)
  }

  const calculateDueDate = (dueDay: number) => {
    const now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth()
    if (now.getDate() > dueDay) {
      month++
      if (month > 11) { month = 0; year++ }
    }
    const dueDate = new Date(year, month, dueDay)
    return dueDate.toISOString().split('T')[0]
  }

  const handleAccountChange = (accountId: string) => {
    const selectedAcc = accounts.find(a => a.id === accountId)
    if (!selectedAcc) return
    
    const isCard = selectedAcc.is_credit_card || false
    const accountType = (selectedAcc.default_type as 'fixa' | 'variavel') || 'variavel'
    
    setIsCreditCard(isCard)

    setFormData(prev => ({ 
      ...prev, 
      account_id: accountId, 
      type: accountType,
      date: isCard && selectedAcc.due_day 
            ? calculateDueDate(selectedAcc.due_day) 
            : prev.date 
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const selectedAcc = accounts.find(a => a.id === formData.account_id)
      
      const dateWithNoon = `${formData.date}T12:00:00.000Z`

      const expenseData: CreateExpenseDTO & { recurrence_months?: number; is_fixed_value?: boolean } = {
        name: selectedAcc?.name || 'Lançamento',
        value: parseFloat(formData.value),
        date: dateWithNoon,
        type: formData.type,
        status: formData.status,
        is_credit_card: isCreditCard,
        ...(formData.type === 'fixa' && {
          recurrence_months: formData.recurrence_months,
          is_fixed_value: formData.is_fixed_value
        })
      }

      await onSave(expenseData)

      setFormData({
        value: '',
        date: new Date().toISOString().split('T')[0],
        account_id: '',
        type: 'variavel',
        status: 'pendente',
        recurrence_months: 12,
        is_fixed_value: true
      })
      setIsCreditCard(false)
      onClose()
    } catch (error: any) {
      addToast('Erro ao salvar lançamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-[#18181b] rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/10 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        
        {/* Glow Decorativo */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-500/10 blur-[50px] rounded-full pointer-events-none"></div>

        <div className="flex justify-between items-center mb-8 relative z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20 shadow-sm">
                <TrendingDown size={20}/>
            </div>
            Nova Despesa
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors bg-white/5 p-2 rounded-xl hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">Conta / Categoria</label>
            <select 
              required
              value={formData.account_id}
              onChange={e => handleAccountChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/50 p-3.5 text-white focus:ring-1 focus:ring-rose-500 outline-none appearance-none cursor-pointer text-sm transition-colors shadow-sm"
            >
              <option value="">Selecione de onde saiu o dinheiro...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-zinc-900">
                  {acc.name} — {acc.default_type === 'fixa' ? 'Recorrente' : 'Variável'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">Valor (R$)</label>
              <input 
                required
                type="number"
                step="0.01"
                value={formData.value}
                onChange={e => setFormData({...formData, value: e.target.value})}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/50 p-3.5 text-white focus:ring-1 focus:ring-rose-500 outline-none font-bold text-rose-400 text-sm transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">
  Vencimento
  {isCreditCard && (
    <span title="Vencimento da Fatura" className="flex items-center">
      <AlertCircle size={12} className="text-indigo-400" />
    </span>
  )}
</label>
              <input 
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                disabled={isCreditCard}
                className={`w-full rounded-xl border border-white/10 bg-zinc-900/50 p-3.5 text-white focus:ring-1 focus:ring-rose-500 outline-none text-sm transition-colors shadow-sm ${isCreditCard ? 'opacity-60 cursor-not-allowed border-indigo-500/30 text-indigo-300' : ''}`}
              />
            </div>
          </div>

          {formData.type === 'fixa' && !isCreditCard && (
             <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                 <div className="flex items-center gap-3">
                     <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-md"><RefreshCcw size={14}/></div>
                     <div>
                         <span className="block text-xs font-bold text-blue-300">Recorrência</span>
                         <span className="block text-[10px] text-zinc-400">Meses a replicar</span>
                     </div>
                 </div>
                 <input 
                    type="number" 
                    min="1" max="120"
                    value={formData.recurrence_months}
                    onChange={e => setFormData({...formData, recurrence_months: parseInt(e.target.value)})}
                    className="w-16 bg-zinc-900/80 border border-white/10 p-2 text-center rounded-lg text-white font-bold text-sm outline-none focus:border-blue-500"
                 />
             </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-3.5 border border-white/10 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 font-bold transition-colors text-sm"
            >
                Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-3.5 bg-rose-600 text-white rounded-xl hover:bg-rose-500 font-bold shadow-lg shadow-rose-900/20 flex justify-center items-center gap-2 transition-all active:scale-95 text-sm disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}