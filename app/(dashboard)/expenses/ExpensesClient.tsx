'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  MoreVertical, Edit2, Trash2, Save, X, Search, CreditCard, 
  Plus, Calendar, DollarSign, TrendingDown, Wallet, ListFilter, 
  SquareCheck, Square, Repeat, ArrowRight, ArrowUpRight, AlertCircle, CheckCircle2, Clock, PieChart
} from 'lucide-react'
import NewExpenseModal from '../../../components/NewExpenseModal'
import CreditCardModal from '../../../components/CreditCardModal'
import UpgradeModal from '../../../components/UpgradeModal'
import { useToast } from '../../../components/ToastContext'

import { Expense, CreateExpenseDTO } from '../../../lib/types'
import { formatCurrency, formatDate } from '../../../lib/utils'

const pillBaseClass = "inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[10px] font-bold whitespace-nowrap transition-all border shadow-sm"
const cardClass = "card relative p-5 sm:p-6 flex flex-col justify-between h-auto min-h-[120px] md:min-h-[140px] overflow-hidden"
const iconBadgeClass = "absolute top-5 right-5 w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10"

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
    <div className="space-y-6 sm:space-y-8 pb-24 animate-in fade-in duration-500 max-w-full overflow-x-hidden">
        
        {/* =========================================================
            HEADER PADRONIZADO COM GRADIENTE
        ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-14 md:pt-0 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Lançamentos</h1>
            <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2">
               <TrendingDown size={14} className="text-rose-400"/>
               Gerencie e rastreie o fluxo de saída financeira
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
             <div className="bg-zinc-900/80 border border-white/10 flex items-center p-1.5 rounded-lg w-full sm:w-auto justify-between shadow-sm">
                <div className="flex items-center gap-2 px-3 border-r border-white/10 shrink-0">
                   <Calendar size={14} className="text-rose-400"/>
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:block">Período</span>
                </div>
                <select value={selectedMonth} onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} className="bg-transparent text-zinc-200 text-sm font-medium py-1.5 px-3 flex-1 cursor-pointer outline-none [&>option]:bg-zinc-900">
                   <option value={-1}>Todos os Meses</option>
                   {months.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
                <select value={selectedYear} onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} className="bg-transparent text-zinc-200 text-sm font-medium py-1.5 px-3 border-l border-white/5 flex-1 cursor-pointer outline-none [&>option]:bg-zinc-900">
                   <option value={-1}>Todos os Anos</option>
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
             </div>
             
             <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 sm:py-2.5 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 text-sm font-bold transition-all active:scale-95 w-full sm:w-auto shrink-0 group">
                <Plus size={18}/> Novo Lançamento <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform"/>
             </button>
          </div>
        </div>

        {/* =========================================================
            KPI CARDS (Visual de Ganhos/Perdas Premium)
        ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Card 1: Total Filtrado */}
            <div className={`${cardClass} bg-gradient-to-br from-zinc-900/40 to-zinc-950`}>
                <div className="w-[85%]">
                    <p className="text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">{searchTerm ? 'Filtrado na Busca' : 'Total no Período'}</p>
                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">{formatCurrency(currentTableTotal)}</h3>
                </div>
                <div className={`${iconBadgeClass} text-rose-400 bg-rose-500/5`}><DollarSign size={18} /></div>
                <div className="mt-4 sm:mt-auto">
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md shadow-sm">Filtrado</span>
                </div>
            </div>

            {/* Card 2: Fluxo Acumulado */}
            <div className={cardClass}>
                <div className="w-[85%]">
                    <p className="text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Acumulado do Ano</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{formatCurrency(kpiData.totalYear)}</h3>
                </div>
                <div className={`${iconBadgeClass} text-zinc-400`}><TrendingDown size={18} /></div>
                <div className="mt-4 sm:mt-auto">
                    <span className="text-[10px] text-zinc-400 font-medium bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">Ano: {selectedYear === -1 ? new Date().getFullYear() : selectedYear}</span>
                </div>
            </div>

            {/* Card 3: Média Mensal */}
            <div className={cardClass}>
                <div className="w-[85%]">
                    <p className="text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Média de Saídas</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{formatCurrency(kpiData.monthlyAverage)}</h3>
                </div>
                <div className={`${iconBadgeClass} text-indigo-400`}><Wallet size={18} /></div>
                <div className="mt-4 sm:mt-auto">
                    <span className="text-[10px] text-zinc-400 font-medium bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">Estimativa mensal</span>
                </div>
            </div>

            {/* Card 4: Em Breve (Novo Recurso) */}
            <div className={`${cardClass} border border-dashed border-white/10 bg-zinc-950/20 opacity-70`}>
                <div className="w-[85%]">
                    <p className="text-[10px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Análise Avançada</p>
                    <h3 className="text-xl md:text-2xl font-bold text-zinc-400 tracking-tight mt-1">Em breve</h3>
                </div>
                <div className={`${iconBadgeClass} text-zinc-500 bg-white/5`}><PieChart size={18} /></div>
                <div className="mt-4 sm:mt-auto">
                    <span className="text-[10px] text-zinc-500 font-medium bg-zinc-900/80 border border-white/5 px-2 py-0.5 rounded-md">Próxima Atualização</span>
                </div>
            </div>
        </div>

        {/* =========================================================
            FILTROS E OPERAÇÕES DA TABELA
        ========================================================= */}
        <div className="space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                
                {/* Linha de Inputs de Filtros */}
                <div className="grid grid-cols-2 md:flex md:flex-row gap-3 w-full lg:w-auto items-center">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full md:w-40 lg:w-48 rounded-lg border border-white/10 bg-zinc-900/80 py-2.5 px-3 text-xs font-semibold text-zinc-300 outline-none focus:border-indigo-500 transition-colors shadow-sm cursor-pointer">
                        <option value="todos">Todos os Status</option>
                        <option value="pago">Pagos</option>
                        <option value="pendente">Pendentes</option>
                    </select>
                    
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full md:w-40 lg:w-48 rounded-lg border border-white/10 bg-zinc-900/80 py-2.5 px-3 text-xs font-semibold text-zinc-300 outline-none focus:border-indigo-500 transition-colors shadow-sm cursor-pointer">
                        <option value="todos">Todos os Tipos</option>
                        <option value="variavel">Despesas Variáveis</option>
                        <option value="fixa">Despesas Recorrentes</option>
                    </select>
                    
                    <div className="relative col-span-2 md:col-span-1 w-full md:w-72 lg:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Procurar despesa específica..." className="w-full rounded-lg border border-white/10 bg-zinc-900/80 py-2.5 pl-9 pr-3 text-xs font-medium text-white outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600 shadow-sm"/>
                    </div>
                </div>

                {/* Ações da Tabela */}
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-end">
                    {selectedIds.length > 0 && (
                        <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-lg text-[11px] font-bold transition-all shadow-md ml-auto lg:ml-0">
                            <Trash2 size={14} /> Excluir em Massa ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            {/* CONTÊINER HÍBRIDO */}
            <div className="card md:overflow-hidden rounded-2xl md:border border-white/5 bg-transparent md:bg-zinc-950/40 p-0 flex flex-col max-h-none md:max-h-[590px] shadow-2xl">
                
                {/* 📱 INTERFACE MOBILE */}
                <div className="block md:hidden space-y-3 p-1">
                    {filteredExpenses.length > 0 && (
                        <div className="flex items-center gap-3 px-2 mb-3">
                           <button onClick={handleSelectAll} className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
                               {selectedIds.length === filteredExpenses.length ? <SquareCheck size={18} className="text-indigo-500" /> : <Square size={18} />}
                               Selecionar Todos da Lista
                           </button>
                        </div>
                    )}

                    {filteredExpenses.length === 0 ? (
                        <div className="text-center text-zinc-500 p-12 text-sm bg-zinc-900/20 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                           <AlertCircle size={24} className="opacity-40 text-zinc-400" />
                           Nenhum lançamento encontrado.
                        </div>
                    ) : (
                        filteredExpenses.map((expense) => {
                            const accountConfig = accountsMap[expense.name]
                            const badgeColor = accountConfig?.color || '#71717a'
                            const displayType = accountConfig?.default_type || expense.type
                            const isSelected = selectedIds.includes(expense.id)

                            return (
                                <div key={expense.id} className={`p-4 rounded-xl border transition-all duration-300 flex flex-col gap-4 relative overflow-hidden ${isSelected ? 'bg-indigo-600/5 border-indigo-500/30' : 'bg-zinc-900/30 border-white/5'}`}>
                                   
                                   <div className="absolute left-0 top-0 bottom-0 w-1 opacity-70" style={{ backgroundColor: badgeColor }} />

                                   {editingId === expense.id ? (
                                       <div className="space-y-3 animate-in fade-in duration-200">
                                           <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Modo Edição: {expense.name}</div>
                                           <input type="date" value={editValues.date} onChange={(e) => setEditValues({...editValues, date: e.target.value})} className="bg-zinc-950 text-white p-3 rounded-xl w-full text-sm font-medium border border-white/10 outline-none focus:border-indigo-500"/>
                                           <input type="number" step="0.01" value={editValues.value} onChange={(e) => setEditValues({...editValues, value: e.target.value})} placeholder="Valor R$" className="bg-zinc-950 text-white p-3 rounded-xl w-full text-sm font-bold border border-white/10 outline-none focus:border-indigo-500"/>
                                           
                                           <div className="flex justify-end gap-3 pt-2">
                                               <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-500 bg-white/5">Cancelar</button>
                                               <button type="button" onClick={() => handleRequestSave(expense.id)} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 flex items-center gap-1.5"><Save size={12}/> Salvar</button>
                                           </div>
                                       </div>
                                   ) : (
                                       <>
                                           <div className="flex justify-between items-start pl-2">
                                               <div className="flex items-start gap-3">
                                                   <button onClick={() => handleSelectOne(expense.id)} className="mt-0.5 text-zinc-500 hover:text-zinc-300">
                                                       {isSelected ? <SquareCheck size={18} className="text-indigo-500" /> : <Square size={18} />}
                                                   </button>
                                                   <div>
                                                       <span onClick={() => handleCardClick(expense)} className={`font-bold text-sm tracking-tight flex items-center gap-1.5 ${expense.is_credit_card ? 'text-indigo-400 cursor-pointer' : 'text-zinc-200'}`}>
                                                           {expense.is_credit_card && <CreditCard size={12}/>}
                                                           {expense.name}
                                                       </span>
                                                       <p className="text-[11px] text-zinc-500 font-semibold mt-0.5">{formatDate(expense.date)}</p>
                                                   </div>
                                               </div>
                                               <div className="text-right">
                                                   <span className={`font-bold text-base tracking-tight ${expense.status === 'pago' ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                                       {formatCurrency(expense.value)}
                                                   </span>
                                               </div>
                                           </div>

                                           <div className="flex items-center justify-between pt-3 border-t border-white/5 pl-2">
                                               <div className="flex items-center gap-2">
                                                   <button onClick={()=>handleToggleStatus(expense.id, expense.status)} className={`${pillBaseClass} ${expense.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]' : 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.05)]'}`}>
                                                       {expense.status === 'pago' ? <CheckCircle2 size={10} className="mr-1"/> : <Clock size={10} className="mr-1"/>}
                                                       {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                                                   </button>
                                                   <span className={`${pillBaseClass} ${displayType === 'fixa' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-zinc-800 text-zinc-400 border-white/5'}`}>
                                                      {displayType === 'fixa' ? 'Recorrente' : 'Variável'}
                                                   </span>
                                               </div>
                                               <div className="flex items-center gap-3">
                                                   <button onClick={()=>handleStartEdit(expense)} className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg bg-white/5"><Edit2 size={14}/></button>
                                                   <button onClick={()=>handleDelete(expense.id)} className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg bg-white/5"><Trash2 size={14}/></button>
                                               </div>
                                           </div>
                                       </>
                                   )}
                                </div>
                            )
                        })
                    )}
                </div>

                {/* 💻 INTERFACE DESKTOP */}
                <div className="hidden md:block overflow-y-auto flex-1 custom-scrollbar">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-md border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <button onClick={handleSelectAll} className="text-zinc-500 hover:text-white transition-colors">
                                        {filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length ? <SquareCheck size={18} className="text-indigo-500" /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Data do Lançamento</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Categoria / Classificação</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredExpenses.length === 0 ? (
                                <tr><td colSpan={6} className="p-16 text-center text-zinc-500 text-sm font-medium">Nenhum lançamento processado neste período.</td></tr>
                            ) : (
                                filteredExpenses.map((expense) => {
                                    const accountConfig = accountsMap[expense.name]
                                    const badgeColor = accountConfig?.color || '#71717a'
                                    const displayType = accountConfig?.default_type || expense.type
                                    const isSelected = selectedIds.includes(expense.id)
                                    
                                    return (
                                    <tr key={expense.id} className={`transition-all group ${isSelected ? 'bg-indigo-600/5' : 'hover:bg-white/5'}`}>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleSelectOne(expense.id)} className="text-zinc-500 hover:text-white transition-colors">
                                                {isSelected ? <SquareCheck size={18} className="text-indigo-500" /> : <Square size={18} />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-zinc-400 font-semibold">
                                            {editingId === expense.id ? <input type="date" value={editValues.date} onChange={(e) => setEditValues({...editValues, date: e.target.value})} className="bg-zinc-800 border border-white/10 text-white p-1.5 rounded-md w-[140px] outline-none focus:border-indigo-500 text-xs font-medium"/> : formatDate(expense.date)}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-white">
                                            <div className="flex items-center gap-2.5">
                                                <span onClick={() => handleCardClick(expense)} className={`${pillBaseClass} ${expense.is_credit_card ? 'cursor-pointer hover:brightness-125' : 'border-transparent'}`} style={{ backgroundColor: hexToRgba(badgeColor, 0.12), color: badgeColor, borderColor: hexToRgba(badgeColor, 0.25) }}>
                                                    {expense.is_credit_card && <CreditCard size={11} className="mr-1.5 opacity-80"/>}
                                                    {expense.name}
                                                </span>
                                                {displayType === 'fixa' ? (
                                                    <span className={`${pillBaseClass} bg-blue-500/5 text-blue-400 border-blue-500/15`}>Recorrente</span>
                                                ) : (
                                                    <span className={`${pillBaseClass} bg-zinc-800 text-zinc-400 border-white/5`}>Variável</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-bold tracking-tight ${expense.status === 'pago' ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                                            {editingId === expense.id ? <input type="number" step="0.01" value={editValues.value} onChange={(e) => setEditValues({...editValues, value: e.target.value})} className="w-24 bg-zinc-800 border border-white/10 text-white p-1.5 rounded-md font-bold outline-none focus:border-indigo-500 text-xs"/> : formatCurrency(expense.value)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={()=>handleToggleStatus(expense.id, expense.status)} className={`${pillBaseClass} ${expense.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.02)]' : 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.02)]'}`}>
                                                {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            {editingId === expense.id ? (
                                                <div className="flex justify-end gap-1.5">
                                                    <button onClick={() => handleRequestSave(expense.id)} className="text-white bg-emerald-600 hover:bg-emerald-500 p-1.5 rounded-md transition-colors"><Save size={14}/></button>
                                                    <button onClick={() => setEditingId(null)} className="text-zinc-300 bg-zinc-700 hover:bg-zinc-600 p-1.5 rounded-md transition-colors"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end transition-opacity">
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

        {/* =========================================================
            BARRA DE CONTEXTO DO RODAPÉ (Padrão Floating Premium)
        ========================================================= */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-md border-t border-white/10 p-4 md:pl-[260px] z-30 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
           <div className="mx-auto flex items-center justify-between text-xs font-semibold text-zinc-400 px-2 sm:px-6">
              <div className="flex items-center gap-2.5">
                <ListFilter size={14} className="text-indigo-400 animate-pulse" />
                <span>Extrato ativo: <strong className="text-white">{filteredExpenses.length}</strong> itens processados</span>
              </div>
              <div className="hidden sm:block text-zinc-500">
                 {selectedYear === -1 ? 'Todos os registros consolidados' : `Exercício fiscal: ${selectedYear}`}
              </div>
           </div>
        </div>

        {/* MODAL DE CONTEXTO DE RECORRÊNCIA */}
        {recurrenceModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
                <div className="w-full max-w-sm bg-[#18181b] rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
                    <div className="flex items-start gap-4">
                        <div className="bg-blue-500/10 p-3.5 rounded-xl text-blue-400 shrink-0 border border-blue-500/20 shadow-md"><Repeat size={22} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">Vínculo Recorrente</h3>
                            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">Você alterou uma despesa recorrente. Como deseja replicar esse valor?</p>
                        </div>
                    </div>
                    <div className="space-y-2.5 pt-1">
                        <button onClick={() => pendingSaveId && executeSave(pendingSaveId, 'single')} className="w-full p-4 rounded-xl bg-zinc-900/50 border border-white/10 hover:border-indigo-500/50 hover:bg-zinc-800 text-left transition-all group shadow-sm">
                            <span className="block text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">Modificar apenas este mês</span>
                        </button>
                        <button onClick={() => pendingSaveId && executeSave(pendingSaveId, 'future')} className="w-full p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600/20 hover:border-indigo-500/50 text-left transition-all shadow-lg shadow-indigo-900/15">
                            <span className="block text-sm font-bold text-indigo-300 flex items-center justify-between">
                                Aplicar para este e futuros <ArrowUpRight size={16} className="text-indigo-400"/>
                            </span>
                        </button>
                    </div>
                    <button onClick={() => setRecurrenceModalOpen(false)} className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors">Descartar Operação</button>
                </div>
            </div>
        )}

        <NewExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveExpense} />
        <CreditCardModal isOpen={!!selectedCardId} onClose={() => setSelectedCardId(null)} expenseId={selectedCardId || ''} expenseName={selectedCardName} onUpdateTotal={() => router.refresh()} />
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}