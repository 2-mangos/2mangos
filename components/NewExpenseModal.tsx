'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { X, Calendar, Tag, Wallet, Check, AlertCircle } from 'lucide-react'
import { Account } from '../lib/types'
import { useToast } from './ToastContext'

interface NewExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function NewExpenseModal({ isOpen, onClose, onSuccess }: NewExpenseModalProps) {
  const { addToast } = useToast()
  const supabase = createClient()
  
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreditCard, setIsCreditCard] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    type: 'variavel' as 'fixa' | 'variavel',
    status: 'pendente' as 'pago' | 'pendente'
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

  // Função para calcular a data de vencimento automática
  const calculateDueDate = (dueDay: number) => {
    const now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth()

    // Se o dia atual já passou do dia de vencimento, assume o mês seguinte
    if (now.getDate() > dueDay) {
      month++
      if (month > 11) {
        month = 0
        year++
      }
    }

    // Cria a data com o dia de vencimento configurado
    const dueDate = new Date(year, month, dueDay)
    return dueDate.toISOString().split('T')[0]
  }

  const handleAccountChange = (accountId: string) => {
    const selectedAcc = accounts.find(a => a.id === accountId)
    const isCard = selectedAcc?.is_credit_card || false
    
    setIsCreditCard(isCard)

    if (isCard && selectedAcc?.due_day) {
      const autoDate = calculateDueDate(selectedAcc.due_day)
      setFormData({ 
        ...formData, 
        account_id: accountId, 
        date: autoDate,
        type: 'variavel' // Cartão é sempre variável por padrão
      })
    } else {
      setFormData({ ...formData, account_id: accountId })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const selectedAcc = accounts.find(a => a.id === formData.account_id)

    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      name: formData.name,
      value: parseFloat(formData.value),
      date: formData.date,
      type: formData.type,
      status: formData.status,
      is_credit_card: isCreditCard,
      // Se quiser guardar a referência da conta na despesa (opcional dependendo da sua DB)
      // account_name: selectedAcc?.name 
    })

    if (error) {
      addToast('Erro ao salvar lançamento', 'error')
    } else {
      addToast('Lançamento realizado!', 'success')
      onSuccess()
      onClose()
      setFormData({
        name: '',
        value: '',
        date: new Date().toISOString().split('T')[0],
        account_id: '',
        type: 'variavel',
        status: 'pendente'
      })
      setIsCreditCard(false)
    }
    setLoading(false)
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
          {/* Nome e Valor */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Descrição</label>
              <input 
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Aluguel, Supermercado..."
                className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
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
          </div>

          {/* Seleção de Conta */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Conta / Categoria</label>
            <select 
              required
              value={formData.account_id}
              onChange={e => handleAccountChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
            >
              <option value="">Selecione uma conta...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} {acc.is_credit_card ? '(Cartão)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Data de Vencimento (Bloqueada se for cartão) */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1 flex justify-between">
              Data de Vencimento
              {isCreditCard && (
                <span className="text-[10px] text-indigo-400 flex items-center gap-1 normal-case">
                  <AlertCircle size={10}/> Automático via Cartão
                </span>
              )}
            </label>
            <div className="relative">
              <input 
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                disabled={isCreditCard}
                className={`w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none ${isCreditCard ? 'opacity-50 cursor-not-allowed border-indigo-500/30 text-indigo-200' : ''}`}
              />
              <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
            </div>
          </div>

          {/* Botão Salvar */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-900/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'Salvando...' : 'Confirmar Lançamento'}
          </button>
        </form>
      </div>
    </div>
  )
}