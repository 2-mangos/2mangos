'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  MoreVertical, Edit2, Trash2, Save, X, Search, CreditCard, 
  Plus, Calendar, DollarSign, TrendingDown, Wallet, ListFilter, 
  SquareCheck, Square, Repeat, ArrowRight
} from 'lucide-react'
import NewExpenseModal from '../../../components/NewExpenseModal'
import CreditCardModal from '../../../components/CreditCardModal'
import UpgradeModal from '../../../components/UpgradeModal'
import { useToast } from '../../../components/ToastContext'

import { Expense, CreateExpenseDTO } from '../../../lib/types'
import { formatCurrency, formatDate } from '../../../lib/utils'

const pillBaseClass = "inline-flex items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold whitespace-nowrap transition-colors border"
// Card base com alturas flexíveis
const cardClass = "card relative p-5 flex flex-col justify-between h-auto min-h-[112px] md:min-h-[160px]"
const iconBadgeClass = "absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-rose-400"

const hexToRgba = (hex: string, alpha: number) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface ExpensesClientProps {
  initialExpenses: Expense[]
  kpiData: { totalYear: number, monthlyAverage: number }
  accountsMap: Record<string, { color: string, default_type: 'fixa' | 'variavel' }>
  userPlan: string
  selectedMonth: number
  selectedYear: number
}

export default function ExpensesClient({ 
  initialExpenses, kpiData, accountsMap, userPlan, selectedMonth, selectedYear 
}: ExpensesClientProps) {
  
  const { addToast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const [searchTerm, setSearchTerm] = useState('')      
  const [filterStatus, setFilterStatus] = useState('todos') 
  const [filterType, setFilterType] = useState('todos')     
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedCardName, setSelectedCardName] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const [recurrenceModalOpen, setRecurrenceModalOpen] = useState(false)
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ date: '', value: '' })

  const menuRef = useRef<HTMLDivElement>(null)

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleFilterChange(month: number, year: number) {
    router.push(`/expenses?month=${month}&year=${year}`)
  }

  const filteredExpenses = initialExpenses.filter(expense => {
    const matchStatus = filterStatus === 'todos' ? true : expense.status === filterStatus
    const matchType = filterType === 'todos' ? true : expense.type === filterType
    const matchSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchStatus && matchType && matchSearch
  })

  const currentTableTotal = filteredExpenses.reduce((acc, curr) => acc + (curr.value || 0), 0)

  function handleSelectAll() {
    if (selectedIds.length === filteredExpenses.length) setSelectedIds([])
    else setSelectedIds(filteredExpenses.map(e => e.id))
  }

  function handleSelectOne(id: string) {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id))
    else setSelectedIds([...selectedIds, id])
  }

  async function handleSaveExpense(data: CreateExpenseDTO & { recurrence_months?: number }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      if (data.type === 'variavel') {
          await supabase.from('expenses').insert({ 
          user_id: user.id, 
          name: data.name, 
          value: data.value, 
          date: data.date, 
          type: 'variavel', 
          status: 'pendente', 
          is_credit_card: data.is_credit_card 
        })
      } else {
        const { data: parentData, error } = await supabase.from('expenses').insert({ 
          user_id: user.id, 
          name: data.name, 
          value: data.value, 
          date: data.date, 
          type: 'fixa', 
          status: 'pendente', 
          recurrence_months: data.recurrence_months, 
          is_fixed_value: data.is_fixed_value, 
          is_credit_card: data.is_credit_card 
        }).select().single()

        if(error) throw error

        const futureExpenses = []
        const monthsCount = data.recurrence_months || 1
        
        for (let i = 1; i < monthsCount; i++) {
          const d = new Date(data.date)
          d.setMonth(d.getMonth() + i)
          futureExpenses.push({ 
            user_id: user.id, 
            name: data.name, 
            value: 0, 
            date: d.toISOString(), 
            type: 'fixa', 
            status: 'pendente', 
            parent_id: parentData.id, 
            is_credit_card: data.is_credit_card 
          })
        }
        if (futureExpenses.length > 0) await supabase.from('expenses').insert(futureExpenses)
      }
      
      addToast("Lançamento salvo com sucesso!", 'success')
      router.refresh() 
    } catch (error: any) { 
      addToast('Erro ao salvar: ' + error.message, 'error') 
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return
    if (!confirm(`Excluir ${selectedIds.length} lançamentos?`)) return 

    const { error } = await supabase.from('expenses').delete().in('id', selectedIds)
    if (error) {
      addToast("Erro ao excluir: " + error.message, 'error')
    } else {
      addToast(`${selectedIds.length} lançamentos excluídos`, 'success')
      setSelectedIds([])
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) addToast("Erro ao excluir", 'error')
    else {
        addToast("Lançamento excluído", 'success')
        router.refresh()
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'pendente' ? 'pago' : 'pendente'
    const { error } = await supabase.from('expenses').update({ status: newStatus }).eq('id', id)
    if (error) addToast("Erro ao atualizar status", 'error')
    else {
      addToast(`Status alterado para ${newStatus}`, 'success')
      router.refresh()
    }
  }

  function handleStartEdit(expense: Expense) { 
    setEditingId(expense.id)
    setEditValues({ 
      date: expense.date.split('T')[0], 
      value: expense.value.toString() 
    })
    setOpenMenuId(null) 
  }

  async function handleRequestSave(id: string) {
      const expense = initialExpenses.find(e => e.id === id)
      if (expense && expense.type === 'fixa') {
          setPendingSaveId(id)
          setRecurrenceModalOpen(true)
      } else {
          await executeSave(id, 'single')
      }
  }

  async function executeSave(id: string, mode: 'single' | 'future') {
    const newValue = parseFloat(editValues.value)
    const newDate = editValues.date
    let error = null

    if (mode === 'single') {
        const { error: err } = await supabase
            .from('expenses')
            .update({ date: newDate, value: newValue })
            .eq('id', id)
        error = err
    } else {
        const expense = initialExpenses.find(e => e.id === id)
        if (!expense) return
        const groupId = expense.parent_id || expense.id
        const { error: err1 } = await supabase
            .from('expenses')
            .update({ date: newDate, value: newValue })
            .eq('id', id)
        
        if (err1) {
            error = err1
        } else {
            const originalDate = expense.date
            const { error: err2 } = await supabase
                .from('expenses')
                .update({ value: newValue }) 
                .or(`id.eq.${groupId},parent_id.eq.${groupId}`) 
                .gt('date', originalDate) 
                .neq('id', id)
            error = err2
        }
    }

    if (error) {
      addToast("Erro ao atualizar", 'error')
    } else { 
      addToast("Atualizado com sucesso!", 'success')
      setEditingId(null)
      setRecurrenceModalOpen(false)
      setPendingSaveId(null)
      router.refresh()
    }
  }

  function handleCardClick(expense: Expense) {
    if (!expense.is_credit_card) return
    if (userPlan === 'free') setShowUpgradeModal(true)
    else { 
      setSelectedCardId(expense.id)
      setSelectedCardName(expense.name) 
    }
  }

  function handleToggleMenu(id: string) { 
    setOpenMenuId(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 animate-in fade-in duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-14 md:pt-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Lançamentos</h1>
            <p className="text-zinc-400 mt-1 text-sm">Gerencie suas <strong className="text-zinc-300">Movimentações</strong></p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
             <div className="bg-zinc-900/80 border border-white/10 flex items-center p-1.5 rounded-lg w-full sm:w-auto justify-between">
                <div className="flex items-center gap-2 px-3 border-r border-white/10 shrink-0">
                   <Calendar size={14} className="text-rose-400"/>
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:block">Período</span>
                </div>
                <select value={selectedMonth} onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} className="bg-transparent text-zinc-200 text-sm font-medium py-1.5 px-3 flex-1 cursor-pointer outline-none [&>option]:bg-zinc-900">
                   <option value={-1}>Todos Mês</option>
                   {months.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
                <select value={selectedYear} onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} className="bg-transparent text-zinc-200 text-sm font-medium py-1.5 px-3 border-l border-white/5 flex-1 cursor-pointer outline-none [&>option]:bg-zinc-900">
                   <option value={-1}>Todos Ano</option>
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
             </div>
             
             <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 sm:py-2.5 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 text-sm font-bold transition-all active:scale-95 w-full sm:w-auto shrink-0">
                <Plus size={18}/> Novo Lançamento
             </button>
          </div>
        </div>

        {/* KPI CARDS (H-auto para Mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={cardClass}>
                <div className="w-[85%]">
                    <p className="text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">{searchTerm ? 'Resultados da Busca' : 'Total de Despesas'}</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{formatCurrency(currentTableTotal)}</h3>
                </div>
                <div className={iconBadgeClass}><DollarSign size={18} /></div>
                <div className="mt-4 sm:mt-auto">
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md">Mês Corrente</span>
                </div>
            </div>
            <div className={cardClass}>
                <div className="w-[85%]">
                    <p className="text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Fluxo Financeiro</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{formatCurrency(kpiData.totalYear)}</h3>
                </div>
                <div className={iconBadgeClass}><TrendingDown size={18} /></div>
                <div className="mt-4 sm:mt-auto">
                    <span className="text-[10px] text-zinc-400 font-medium bg-white/5 border border-white/5 px-2 py-1 rounded-md">Acumulado ({selectedYear === -1 ? new Date().getFullYear() : selectedYear})</span>
                </div>
            </div>
            <div className={cardClass}>
                <div className="w-[85%]">
                    <p className="text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Média Mensal</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{formatCurrency(kpiData.monthlyAverage)}</h3>
                </div>
                <div className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-indigo-400">
                    <Wallet size={18} />
                </div>
                <div className="mt-4 sm:mt-auto">
                    <span className="text-[10px] text-zinc-400 font-medium bg-white/5 border border-white/5 px-2 py-1 rounded-md">Estimativa anual</span>
                </div>
            </div>
        </div>

        {/* TABELA E FILTROS */}
        <div className="space-y-4">
            
            {/* Header Lista + Filtros em Grid para Mobile */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <h3 className="text-base font-bold text-white">Movimentações</h3>
                    {selectedIds.length > 0 && (
                        <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-lg text-[11px] font-bold transition-all shadow-md">
                            <Trash2 size={14} /> Excluir ({selectedIds.length})
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-2 md:flex md:w-auto gap-3 w-full">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full rounded-lg border border-white/10 bg-zinc-900/80 py-2.5 px-3 text-xs font-medium text-zinc-300 outline-none focus:border-indigo-500 transition-colors">
                        <option value="todos">Status: Todos</option>
                        <option value="pago">Pagos</option>
                        <option value="pendente">Pendentes</option>
                    </select>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-zinc-900/80 py-2.5 px-3 text-xs font-medium text-zinc-300 outline-none focus:border-indigo-500 transition-colors">
                        <option value="todos">Tipo: Todos</option>
                        <option value="variavel">Variáveis</option>
                        <option value="fixa">Recorrentes</option>
                    </select>
                    <div className="relative col-span-2 md:col-span-1 md:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Procurar despesa..." className="w-full rounded-lg border border-white/10 bg-zinc-900/80 py-2.5 pl-9 pr-3 text-xs font-medium text-white outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"/>
                    </div>
                </div>
            </div>

            {/* CONTÊINER HÍBRIDO (Cards no Mobile, Tabela no Desktop) */}
            <div className="card md:overflow-hidden rounded-xl md:border border-white/5 bg-transparent md:bg-zinc-950/50 p-0 flex flex-col max-h-none md:max-h-[590px]">
                
                {/* 📱 VERSÃO MOBILE: LISTA DE CARDS (Oculto em 'md') */}
                <div className="block md:hidden space-y-3 p-1">
                    {/* Botão Selecionar Todos - Mobile */}
                    {filteredExpenses.length > 0 && (
                        <div className="flex items-center gap-3 px-2 mb-4">
                           <button onClick={handleSelectAll} className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                               {selectedIds.length === filteredExpenses.length ? <SquareCheck size={18} className="text-indigo-500" /> : <Square size={18} />}
                               Selecionar Tudo
                           </button>
                        </div>
                    )}

                    {filteredExpenses.length === 0 ? (
                        <div className="text-center text-zinc-500 py-10 text-sm bg-zinc-900/30 rounded-xl border border-white/5">Nenhum lançamento encontrado.</div>
                    ) : (
                        filteredExpenses.map((expense) => {
                            const accountConfig = accountsMap[expense.name]
                            const badgeColor = accountConfig?.color || '#71717a'
                            const displayType = accountConfig?.default_type || expense.type
                            const isSelected = selectedIds.includes(expense.id)

                            return (
                                <div key={expense.id} className={`p-4 rounded-xl border transition-colors ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-zinc-900/60 border-white/5'}`}>
                                   
                                   {/* Edição Inline Mobile */}
                                   {editingId === expense.id ? (
                                       <div className="space-y-3 animate-in fade-in duration-200">
                                           <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Editando: {expense.name}</div>
                                           <input type="date" value={editValues.date} onChange={(e) => setEditValues({...editValues, date: e.target.value})} className="bg-[#18181b] text-white p-3 rounded-lg w-full text-sm font-medium border border-white/10 outline-none focus:border-indigo-500"/>
                                           <input type="number" step="0.01" value={editValues.value} onChange={(e) => setEditValues({...editValues, value: e.target.value})} placeholder="Valor R$" className="bg-[#18181b] text-white p-3 rounded-lg w-full text-sm font-bold border border-white/10 outline-none focus:border-indigo-500"/>
                                           
                                           <div className="flex justify-end gap-3 pt-2">
                                               <button onClick={() => setEditingId(null)} className="px-5 py-2.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white bg-white/5 transition-colors">Cancelar</button>
                                               <button onClick={() => handleRequestSave(expense.id)} className="px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"><Save size={14}/> Salvar</button>
                                           </div>
                                       </div>
                                   ) : (
                                       /* Visualização Normal Mobile */
                                       <>
                                           <div className="flex justify-between items-start mb-4">
                                               <div className="flex items-start gap-3.5">
                                                   <button onClick={() => handleSelectOne(expense.id)} className="mt-0.5 text-zinc-500 transition-colors">
                                                       {isSelected ? <SquareCheck size={20} className="text-indigo-500" /> : <Square size={20} />}
                                                   </button>
                                                   <div>
                                                       <span onClick={() => handleCardClick(expense)} className={`font-bold text-sm tracking-tight flex items-center gap-1.5 ${expense.is_credit_card ? 'text-indigo-300' : 'text-zinc-200'}`}>
                                                           {expense.is_credit_card && <CreditCard size={12}/>}
                                                           {expense.name}
                                                       </span>
                                                       <p className="text-xs text-zinc-500 font-medium mt-1">{formatDate(expense.date)}</p>
                                                   </div>
                                               </div>
                                               <div className="text-right pl-2">
                                                   <span className={`font-bold text-sm tracking-tight ${expense.status === 'pago' ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                                       {formatCurrency(expense.value)}
                                                   </span>
                                               </div>
                                           </div>

                                           <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                               <div className="flex items-center gap-2.5">
                                                   <button onClick={()=>handleToggleStatus(expense.id, expense.status)} className={`${pillBaseClass} ${expense.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                       {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                                                   </button>
                                                   <span className={`${pillBaseClass} ${displayType === 'fixa' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
                                                      {displayType === 'fixa' ? 'Recorrente' : 'Variável'}
                                                   </span>
                                               </div>
                                               <div className="flex items-center gap-4">
                                                   <button onClick={()=>handleStartEdit(expense)} className="text-zinc-500 hover:text-white p-1 transition-colors"><Edit2 size={16}/></button>
                                                   <button onClick={()=>handleDelete(expense.id)} className="text-zinc-500 hover:text-rose-400 p-1 transition-colors"><Trash2 size={16}/></button>
                                               </div>
                                           </div>
                                       </>
                                   )}
                                </div>
                            )
                        })
                    )}
                </div>

                {/* 💻 VERSÃO DESKTOP: TABELA (Oculto em 'sm/mobile') */}
                <div className="hidden md:block overflow-y-auto flex-1 custom-scrollbar">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-zinc-900/90 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <button onClick={handleSelectAll} className="text-zinc-500 hover:text-white transition-colors">
                                        {filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length ? <SquareCheck size={18} className="text-indigo-500" /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Categoria</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredExpenses.length === 0 ? (
                                <tr><td colSpan={6} className="p-16 text-center text-zinc-500 text-sm">Nenhum lançamento no período.</td></tr>
                            ) : (
                                filteredExpenses.map((expense) => {
                                    const accountConfig = accountsMap[expense.name]
                                    const badgeColor = accountConfig?.color || '#71717a'
                                    const displayType = accountConfig?.default_type || expense.type
                                    const isSelected = selectedIds.includes(expense.id)
                                    
                                    return (
                                    <tr key={expense.id} className={`transition-all group ${isSelected ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}>
                                        <td className="px-6 py-3.5">
                                            <button onClick={() => handleSelectOne(expense.id)} className="text-zinc-500 hover:text-white transition-colors">
                                                {isSelected ? <SquareCheck size={18} className="text-indigo-500" /> : <Square size={18} />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-3.5 text-xs text-zinc-300 font-medium">
                                            {editingId === expense.id ? <input type="date" value={editValues.date} onChange={(e) => setEditValues({...editValues, date: e.target.value})} className="bg-zinc-800 border border-white/10 text-white p-1.5 rounded-md w-[130px] outline-none focus:border-indigo-500"/> : formatDate(expense.date)}
                                        </td>
                                        <td className="px-6 py-3.5 text-xs text-white">
                                            <div className="flex items-center gap-2">
                                                <span onClick={() => handleCardClick(expense)} className={`${pillBaseClass} ${expense.is_credit_card ? 'cursor-pointer hover:opacity-80' : 'border-transparent'}`} style={{ backgroundColor: hexToRgba(badgeColor, 0.15), color: badgeColor, borderColor: hexToRgba(badgeColor, 0.3) }}>
                                                    {expense.is_credit_card && <CreditCard size={10} className="mr-1.5"/>}
                                                    {expense.name}
                                                </span>
                                                {displayType === 'fixa' ? (
                                                    <span className={`${pillBaseClass} bg-blue-500/10 text-blue-400 border-blue-500/20`}>Recorrente</span>
                                                ) : (
                                                    <span className={`${pillBaseClass} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`}>Variável</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={`px-6 py-3.5 text-sm font-bold tracking-tight ${expense.status === 'pago' ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                                            {editingId === expense.id ? <input type="number" step="0.01" value={editValues.value} onChange={(e) => setEditValues({...editValues, value: e.target.value})} className="w-24 bg-zinc-800 border border-white/10 text-white p-1.5 rounded-md font-bold outline-none focus:border-indigo-500"/> : formatCurrency(expense.value)}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <button onClick={()=>handleToggleStatus(expense.id, expense.status)} className={`${pillBaseClass} ${expense.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'}`}>
                                                {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-3.5 text-right relative">
                                            {editingId === expense.id ? (
                                                <div className="flex justify-end gap-1.5">
                                                    <button onClick={() => handleRequestSave(expense.id)} className="text-white bg-emerald-600 hover:bg-emerald-500 p-1.5 rounded-md transition-colors"><Save size={14}/></button>
                                                    <button onClick={() => setEditingId(null)} className="text-zinc-300 bg-zinc-700 hover:bg-zinc-600 p-1.5 rounded-md transition-colors"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e)=>{e.stopPropagation(); handleToggleMenu(expense.id)}} className="text-zinc-400 hover:text-white p-1.5 hover:bg-white/10 rounded-md transition-colors"><MoreVertical size={16}/></button>
                                                    {openMenuId === expense.id && (
                                                        <div ref={menuRef} className="absolute right-10 top-2 z-50 w-32 bg-zinc-800 shadow-xl rounded-xl border border-white/10 overflow-hidden py-1 animate-in fade-in zoom-in-95">
                                                            <button onClick={()=>handleStartEdit(expense)} className="w-full px-4 py-2.5 hover:bg-white/5 text-zinc-200 text-xs font-medium flex items-center gap-2 transition-colors"><Edit2 size={12}/> Editar</button>
                                                            <div className="h-px bg-white/5 mx-2 my-0.5"></div>
                                                            <button onClick={()=>handleDelete(expense.id)} className="w-full px-4 py-2.5 hover:bg-rose-500/10 text-rose-400 text-xs font-medium flex items-center gap-2 transition-colors"><Trash2 size={12}/> Deletar</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* FOOTER BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-md border-t border-white/10 p-3.5 md:pl-[260px] z-30">
           <div className="mx-auto flex items-center justify-between text-xs font-medium text-zinc-400 px-2 sm:px-6">
              <div className="flex items-center gap-2">
                <ListFilter size={14} className="text-indigo-400" />
                <span>Exibindo <strong className="text-white">{filteredExpenses.length}</strong> Lançamentos</span>
              </div>
              <div className="hidden sm:block">
                 {selectedYear === -1 ? 'Todos os períodos consolidados' : `Período ativo: ${selectedYear}`}
              </div>
           </div>
        </div>

        {/* MODAL DE RECORRÊNCIA */}
        {recurrenceModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
                <div className="w-full max-w-sm bg-[#18181b] rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
                    <div className="flex items-start gap-4">
                        <div className="bg-blue-500/10 p-3.5 rounded-full text-blue-400 shrink-0 border border-blue-500/20"><Repeat size={24} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">Editar Recorrência</h3>
                            <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Este é um gasto recorrente. Como deseja aplicar as alterações?</p>
                        </div>
                    </div>
                    <div className="space-y-2.5 pt-2">
                        <button onClick={() => pendingSaveId && executeSave(pendingSaveId, 'single')} className="w-full p-4 rounded-xl bg-zinc-800/50 border border-white/10 hover:border-indigo-500/50 hover:bg-zinc-800 text-left transition-all group">
                            <span className="block text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">Apenas este lançamento</span>
                        </button>
                        <button onClick={() => pendingSaveId && executeSave(pendingSaveId, 'future')} className="w-full p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600/20 hover:border-indigo-500/50 text-left transition-all shadow-lg shadow-indigo-900/10">
                            <span className="block text-sm font-bold text-indigo-300 flex items-center justify-between">
                                Este e os próximos <ArrowRight size={16} className="text-indigo-400"/>
                            </span>
                        </button>
                    </div>
                    <button onClick={() => setRecurrenceModalOpen(false)} className="w-full py-3 text-sm font-bold text-zinc-500 hover:text-white transition-colors">Cancelar Operação</button>
                </div>
            </div>
        )}

        <NewExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveExpense} />
        <CreditCardModal isOpen={!!selectedCardId} onClose={() => setSelectedCardId(null)} expenseId={selectedCardId || ''} expenseName={selectedCardName} onUpdateTotal={() => router.refresh()} />
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}