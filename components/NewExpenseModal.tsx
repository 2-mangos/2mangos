'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { X, Calendar, AlertCircle } from 'lucide-react'
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
      
      // CORREÇÃO DEFINITIVA: Forçamos o horário para o meio do dia (12:00) 
      // para evitar que o fuso horário recue a data para o dia anterior.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Novo Lançamento</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Conta / Categoria</label>
            <select 
              required
              value={formData.account_id}
              onChange={e => handleAccountChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
            >
              <option value="">Selecione...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — {acc.default_type === 'fixa' ? 'Recorrente' : 'Variável'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Valor (R$)</label>
              <input 
                required
                type="number"
                step="0.01"
                value={formData.value}
                onChange={e => setFormData({...formData, value: e.target.value})}
                placeholder="0,00"
                className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1 flex justify-between">
                Vencimento
                {isCreditCard && <AlertCircle size={12} className="text-indigo-400" />}
              </label>
              <div className="relative">
                <input 
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  disabled={isCreditCard}
                  className={`w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none ${isCreditCard ? 'opacity-50 cursor-not-allowed border-indigo-500/30 text-indigo-200' : ''}`}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-900/20 disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar Lançamento'}
          </button>
        </form>
      </div>
    </div>
  )
}