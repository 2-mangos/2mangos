'use client'

import { createClient } from '../../../lib/supabase'
import { useState, useRef, useEffect, RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, Plus, MoreVertical, Edit3, Trash2, X, Check, 
  CreditCard, Tag, GripVertical, Layers, Palette, Wallet, ArrowRight,
  Landmark, PiggyBank, ShoppingBag, Car, Home, Briefcase, 
  GraduationCap, Utensils, Plane, Gamepad2, Gift, Smartphone, 
  Wrench, Droplets, Lightbulb, LucideIcon, Dumbbell, Stethoscope, 
  PawPrint, Baby, Shirt, Music, Tv, Wifi, Fuel, Coffee, Bus,
  CalendarClock, Zap, Target 
} from 'lucide-react'
import { useToast } from '../../../components/ToastContext'

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Account } from '../../../lib/types'
import { formatCurrency } from '../../../lib/utils'

// --- CONFIGURAÇÕES ---
const COLORS = [ 
  { hex: '#3b82f6', name: 'Azul' }, { hex: '#ef4444', name: 'Vermelho' }, 
  { hex: '#22c55e', name: 'Verde' }, { hex: '#f59e0b', name: 'Laranja' }, 
  { hex: '#a855f7', name: 'Roxo' }, { hex: '#ec4899', name: 'Rosa' }, 
  { hex: '#6366f1', name: 'Indigo' }, { hex: '#6b7280', name: 'Cinza' } 
]

const AVAILABLE_ICONS: { id: string, icon: LucideIcon, label: string }[] = [
    { id: 'wallet', icon: Wallet, label: 'Carteira' },
    { id: 'bank', icon: Landmark, label: 'Banco' },
    { id: 'card', icon: CreditCard, label: 'Cartão' },
    { id: 'piggy', icon: PiggyBank, label: 'Economia' },
    { id: 'home', icon: Home, label: 'Casa' },
    { id: 'food', icon: Utensils, label: 'Alimentação' },
    { id: 'coffee', icon: Coffee, label: 'Café/Lanches' },
    { id: 'shopping', icon: ShoppingBag, label: 'Compras' },
    { id: 'shirt', icon: Shirt, label: 'Vestuário' },
    { id: 'light', icon: Lightbulb, label: 'Luz' },
    { id: 'water', icon: Droplets, label: 'Água' },
    { id: 'phone', icon: Smartphone, label: 'Celular' },
    { id: 'wifi', icon: Wifi, label: 'Internet' },
    { id: 'fix', icon: Wrench, label: 'Serviços' },
    { id: 'car', icon: Car, label: 'Carro' },
    { id: 'fuel', icon: Fuel, label: 'Combustível' },
    { id: 'bus', icon: Bus, label: 'Transporte Pub.' },
    { id: 'travel', icon: Plane, label: 'Viagem' },
    { id: 'health', icon: Stethoscope, label: 'Saúde' },
    { id: 'gym', icon: Dumbbell, label: 'Academia' },
    { id: 'education', icon: GraduationCap, label: 'Estudos' },
    { id: 'work', icon: Briefcase, label: 'Trabalho' },
    { id: 'baby', icon: Baby, label: 'Crianças' },
    { id: 'pet', icon: PawPrint, label: 'Pets' },
    { id: 'leisure', icon: Gamepad2, label: 'Lazer' },
    { id: 'tv', icon: Tv, label: 'Streaming' },
    { id: 'music', icon: Music, label: 'Música' },
    { id: 'gift', icon: Gift, label: 'Presente' },
]

const AccountIconDisplay = ({ iconId, size = 20, className = "" }: { iconId?: string, size?: number, className?: string }) => {
    const iconObj = AVAILABLE_ICONS.find(i => i.id === iconId) || AVAILABLE_ICONS[0]
    const IconComponent = iconObj.icon
    return <IconComponent size={size} className={className} />
}

interface SortableItemProps {
  account: Account
  openEditModal: (acc: Account) => void
  handleDelete: (id: string) => void
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  menuRef: RefObject<HTMLDivElement | null> 
}

function SortableAccountItem({ account, openEditModal, handleDelete, openMenuId, setOpenMenuId, menuRef }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id })
  const isOpen = openMenuId === account.id
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    zIndex: isDragging ? 50 : (isOpen ? 40 : 1), 
    opacity: isDragging ? 0.6 : 1, 
    position: 'relative' as const 
  }

  return (
    <li ref={setNodeRef} style={style} className="group relative">
        <div className={`
            flex items-center justify-between p-4 rounded-2xl border transition-all duration-200
            ${isOpen ? 'bg-zinc-800 border-indigo-500/30 shadow-lg' : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/80'}
        `}>
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <div 
                    {...attributes} 
                    {...listeners} 
                    className="text-zinc-700 hover:text-zinc-400 cursor-grab active:cursor-grabbing p-1 touch-none transition-colors"
                >
                    <GripVertical size={18} />
                </div>
                
                <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white shadow-inner shrink-0 border border-white/10 relative overflow-hidden" 
                    style={{ backgroundColor: account.color || '#3b82f6' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
                    <div className="relative z-10">
                       <AccountIconDisplay iconId={account.icon} size={20} />
                    </div>
                </div>

                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-zinc-200 text-sm truncate">{account.name}</span>
                    
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                            account.default_type === 'fixa' 
                            ? 'text-blue-300 bg-blue-500/10 border-blue-500/20' 
                            : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                        }`}>
                           {account.default_type === 'fixa' ? <CalendarClock size={10}/> : <Zap size={10}/>}
                           {account.default_type === 'fixa' ? 'Recorrente' : 'Variável'}
                        </span>

                        {account.is_credit_card && (
                             <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                 <CreditCard size={10}/> Cartão
                             </span>
                        )}

                        {account.is_credit_card && (account.credit_limit || 0) > 0 && (
                             <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded-full border border-white/5">
                                 Lim: <span className="text-zinc-300">{formatCurrency(account.credit_limit || 0)}</span>
                             </span>
                        )}

                        {(account.monthly_budget || 0) > 0 && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded-full border border-white/5">
                                Meta: <span className="text-zinc-300">{formatCurrency(account.monthly_budget || 0)}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative ml-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(isOpen ? null : account.id) }} 
                    className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                >
                    <MoreVertical size={16}/>
                </button>
                
                {isOpen && (
                    <div ref={menuRef} className="absolute right-0 top-full mt-2 w-36 bg-zinc-950 rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-50">
                        <div className="p-1 space-y-0.5">
                            <button onClick={() => openEditModal(account)} className="flex w-full items-center px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors font-medium">
                                <Edit3 size={12} className="mr-2" /> Editar
                            </button>
                            <div className="h-px bg-white/5 my-1 mx-2"></div>
                            <button onClick={() => handleDelete(account.id)} className="flex w-full items-center px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-colors font-medium">
                                <Trash2 size={12} className="mr-2" /> Excluir
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </li>
  )
}

interface AccountsClientProps {
  initialAccounts: Account[]
}

export default function AccountsClient({ initialAccounts }: AccountsClientProps) {
  const { addToast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  
  const [formData, setFormData] = useState({ 
      name: '', 
      is_credit_card: false, 
      color: COLORS[0].hex, 
      credit_limit: '',
      monthly_budget: '', 
      icon: 'wallet',
      default_type: 'variavel' as 'fixa' | 'variavel',
      closing_day: '',
      due_day: ''
  })
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  
  const menuRef = useRef<HTMLDivElement>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  useEffect(() => { setAccounts(initialAccounts) }, [initialAccounts])

  useEffect(() => { 
    function h(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h) 
  }, [])

  async function handleDragEnd(event: DragEndEvent) { 
    const { active, over } = event
    if (over && active.id !== over.id) { 
        setAccounts((items) => { 
            const oldIndex = items.findIndex((item) => item.id === active.id)
            const newIndex = items.findIndex((item) => item.id === over.id)
            const newOrder = arrayMove(items, oldIndex, newIndex)
            saveOrderToSupabase(newOrder) 
            return newOrder 
        }) 
    } 
  }

  async function saveOrderToSupabase(updatedAccounts: Account[]) { 
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const updates = updatedAccounts.map((acc, index) => ({ 
        id: acc.id, 
        user_id: user.id, 
        name: acc.name, 
        is_credit_card: acc.is_credit_card, 
        color: acc.color, 
        order_index: index, 
        credit_limit: acc.credit_limit,
        monthly_budget: acc.monthly_budget, 
        icon: acc.icon,
        default_type: acc.default_type,
        closing_day: acc.closing_day,
        due_day: acc.due_day
    }))
    await supabase.from('accounts').upsert(updates) 
    router.refresh()
  }

  function openNewModal() { 
      setEditingAccount(null)
      setFormData({ 
        name: '', 
        is_credit_card: false, 
        color: COLORS[0].hex, 
        credit_limit: '', 
        monthly_budget: '', 
        icon: 'wallet', 
        default_type: 'variavel',
        closing_day: '',
        due_day: ''
      })
      setIsModalOpen(true) 
  }
  
  function openEditModal(account: Account) { 
      setEditingAccount(account)
      setFormData({ 
          name: account.name, 
          is_credit_card: account.is_credit_card, 
          color: account.color || COLORS[0].hex,
          credit_limit: account.credit_limit ? account.credit_limit.toString() : '',
          monthly_budget: account.monthly_budget ? account.monthly_budget.toString() : '',
          icon: account.icon || 'wallet',
          default_type: (account.default_type as 'fixa' | 'variavel') || 'variavel',
          closing_day: account.closing_day ? account.closing_day.toString() : '',
          due_day: account.due_day ? account.due_day.toString() : ''
      })
      setOpenMenuId(null)
      setIsModalOpen(true) 
  }
  
  async function handleSave(e: React.FormEvent) { 
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !formData.name.trim()) return

    const limitValue = formData.is_credit_card && formData.credit_limit ? parseFloat(formData.credit_limit) : 0
    const budgetValue = formData.monthly_budget ? parseFloat(formData.monthly_budget) : 0
    const closingDayValue = formData.is_credit_card && formData.closing_day ? parseInt(formData.closing_day) : null
    const dueDayValue = formData.is_credit_card && formData.due_day ? parseInt(formData.due_day) : null

    const payload = {
        name: formData.name,
        is_credit_card: formData.is_credit_card,
        color: formData.color,
        credit_limit: limitValue,
        monthly_budget: budgetValue,
        icon: formData.icon,
        default_type: formData.default_type,
        closing_day: closingDayValue,
        due_day: dueDayValue
    }

    let error = null
    
    if (editingAccount) {
      // 1. Atualiza a conta em si
      const { error: errAccount } = await supabase.from('accounts').update(payload).eq('id', editingAccount.id)
      error = errAccount

      // 2. Se o nome mudou, atualiza todas as despesas que usavam o nome antigo
      if (!error && editingAccount.name !== formData.name) {
          const { error: errExpenses } = await supabase
            .from('expenses')
            .update({ name: formData.name })
            .eq('user_id', user.id)
            .eq('name', editingAccount.name)
          
          if (errExpenses) {
              console.error("Erro ao atualizar registros anteriores:", errExpenses.message)
              // Opcional: addToast("Conta atualizada, mas houve erro nos registros antigos", 'warning')
          }
      }
    } else {
      let newIndex = accounts.length
      const { error: err } = await supabase.from('accounts').insert({ user_id: user.id, order_index: newIndex, ...payload })
      error = err
    }

    if (error) addToast("Erro: " + error.message, 'error')
    else {
        addToast(editingAccount ? "Atualizado e sincronizado com sucesso!" : "Categoria criada com sucesso!", 'success')
        setIsModalOpen(false)
        router.refresh()
    }
}

  async function handleDelete(id: string) { 
    if (!confirm('Atenção: Isso excluirá todas as movimentações e lançamentos vinculados a esta conta. Continuar?')) return
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) addToast("Erro ao excluir conta", 'error')
    else {
        addToast("Conta excluída", 'success')
        router.refresh()
    }
  }

  const filteredAccounts = accounts.filter(acc => acc.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const isCustomColor = !COLORS.some(c => c.hex === formData.color)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Categorias</h1>
            <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2">
                <Layers size={14} className="text-indigo-400"/>
                Gerencie suas categorias e padrões de lançamento
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative group w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-white transition-colors" size={16} />
                <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    placeholder="Filtrar" 
                    className="w-full rounded-lg border border-white/10 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-zinc-600"
                />
             </div>
             
             <button 
                onClick={openNewModal} 
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 text-sm font-bold transition-all active:scale-95 whitespace-nowrap"
             >
                <Plus size={18}/> <span className="hidden sm:inline">Nova</span>
             </button>
          </div>
        </div>

        {/* LISTA DE CONTAS */}
        <div className="flex flex-col gap-4">
          {filteredAccounts.length === 0 ? (
              <div className="card rounded-2xl p-12 text-center flex flex-col items-center justify-center border border-dashed border-white/10 bg-zinc-900/20">
                  <div className="bg-zinc-900 p-4 rounded-full mb-4 ring-1 ring-white/10">
                    <Tag size={32} className="text-zinc-600"/>
                  </div>
                  <h3 className="text-zinc-300 font-bold mb-1">Nenhuma Conta encontrada</h3>
                  <p className="text-zinc-500 text-sm max-w-xs mb-4">Cadastre seus bancos, cartões ou carteiras para organizar seus <strong className="text-zinc-400">Lançamentos</strong>.</p>
                  <button onClick={openNewModal} className="text-indigo-400 text-sm font-bold hover:underline hover:text-indigo-300">
                    Criar minha primeira conta
                  </button>
              </div>
          ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filteredAccounts.map(a => a.id)} strategy={verticalListSortingStrategy}>
                      <ul className="grid gap-3">
                          {filteredAccounts.map((acc) => (
                              <SortableAccountItem 
                                key={acc.id} 
                                account={acc} 
                                openEditModal={openEditModal} 
                                handleDelete={handleDelete} 
                                openMenuId={openMenuId} 
                                setOpenMenuId={setOpenMenuId} 
                                menuRef={menuRef}
                              />
                          ))}
                      </ul>
                  </SortableContext>
              </DndContext>
          )}
        </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-zinc-900 shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {editingAccount ? <Edit3 size={18} className="text-indigo-400"/> : <Plus size={18} className="text-indigo-400"/>}
                        {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Defina os detalhes da sua <strong className="text-zinc-400">Conta</strong>.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                   <Tag size={12}/> Nome da Conta
                </label>
                <input 
                    autoFocus 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ex: Nubank, Carteira, Alimentação..." 
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3.5 text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 outline-none placeholder:text-zinc-700 text-sm transition-all"
                />
              </div>
              
              <div className="space-y-3">
                 <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                   <Zap size={12}/> Tipo Padrão de Lançamento
                </label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, default_type: 'variavel'})}
                        className={`
                           flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2
                           ${formData.default_type === 'variavel' 
                             ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                             : 'bg-zinc-950 border-white/10 text-zinc-500 hover:bg-zinc-900'
                           }
                        `}
                    >
                        <Zap size={14} /> Variável
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, default_type: 'fixa'})}
                        className={`
                           flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2
                           ${formData.default_type === 'fixa' 
                             ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                             : 'bg-zinc-950 border-white/10 text-zinc-500 hover:bg-zinc-900'
                           }
                        `}
                    >
                        <CalendarClock size={14} /> Recorrente
                    </button>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 ml-1 flex items-center gap-1.5">
                          <Target size={10}/> Meta de Gasto Mensal (R$)
                      </label>
                      <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">R$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                value={formData.monthly_budget} 
                                onChange={(e) => setFormData({...formData, monthly_budget: e.target.value})} 
                                placeholder="Ex: 500,00" 
                                className="w-full rounded-lg border border-white/10 bg-zinc-950 py-2.5 pl-9 pr-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none text-sm placeholder:text-zinc-700 font-bold"
                            />
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">
                          Defina um teto para acompanhar seus gastos nesta categoria.
                      </p>
                </div>
              </div>

              <div className="space-y-3">
                 <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                   <GripVertical size={12}/> Ícone
                </label>
                <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 grid grid-cols-6 gap-2">
                    {AVAILABLE_ICONS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setFormData({...formData, icon: item.id})}
                            title={item.label}
                            className={`
                                h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200
                                ${formData.icon === item.id 
                                    ? 'bg-indigo-600 text-white shadow-lg scale-110' 
                                    : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                                }
                            `}
                        >
                            <item.icon size={18} />
                        </button>
                    ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                   <Palette size={12}/> Cor
                </label>
                <div className="bg-zinc-950 p-4 rounded-xl border border-white/5">
                    <div className="flex flex-wrap gap-3">
                        {COLORS.map((color) => (
                            <button 
                                key={color.hex} 
                                type="button" 
                                onClick={() => setFormData({...formData, color: color.hex})} 
                                className={`h-8 w-8 rounded-full transition-all hover:scale-110 flex items-center justify-center ring-2 ring-offset-2 ring-offset-zinc-950 ${formData.color === color.hex ? 'ring-indigo-500 scale-110 shadow-lg shadow-indigo-500/20' : 'ring-transparent opacity-70 hover:opacity-100'}`} 
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                            >
                                {formData.color === color.hex && <Check size={14} className="text-white drop-shadow-md"/>}
                            </button>
                        ))}
                        <div className="w-px h-8 bg-white/10 mx-1"></div>
                        <div className="relative group">
                            <input 
                                type="color" 
                                id="custom-color" 
                                value={formData.color} 
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })} 
                                className="sr-only" 
                            />
                            <label 
                                htmlFor="custom-color" 
                                className={`h-8 w-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer bg-zinc-900 border border-white/10 ring-2 ring-offset-2 ring-offset-zinc-950 ${isCustomColor ? 'ring-indigo-500' : 'ring-transparent'}`}
                            >
                                <Plus size={14} className="text-zinc-500 group-hover:text-white" />
                            </label>
                        </div>
                    </div>
                </div>
              </div>
              
              <div 
                onClick={() => {
                    const isNowCard = !formData.is_credit_card
                    setFormData({
                        ...formData, 
                        is_credit_card: isNowCard
                    })
                }}
                className={`
                    relative overflow-hidden cursor-pointer rounded-xl border p-4 transition-all duration-300
                    ${formData.is_credit_card 
                        ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/30' 
                        : 'bg-zinc-950 border-white/5 hover:border-white/10 hover:bg-zinc-900'
                    }
                `}
              >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`
                        p-3 rounded-lg transition-colors
                        ${formData.is_credit_card ? 'bg-purple-500 text-white shadow-lg shadow-purple-900/30' : 'bg-zinc-800 text-zinc-500'}
                    `}>
                        <CreditCard size={20}/>
                    </div>
                    <div className="flex-1">
                        <span className={`text-sm font-bold block mb-0.5 ${formData.is_credit_card ? 'text-white' : 'text-zinc-300'}`}>
                            Cartão de Crédito
                        </span>
                        <span className="text-[11px] text-zinc-500 leading-tight block">
                            Habilita funções de fatura e limites deste <strong className="text-zinc-400">Meio de Crédito</strong>.
                        </span>
                    </div>
                    <div className={`
                        w-6 h-6 rounded-full border flex items-center justify-center transition-colors
                        ${formData.is_credit_card ? 'bg-purple-500 border-purple-400 text-white' : 'border-zinc-700 bg-zinc-900'}
                    `}>
                        {formData.is_credit_card && <Check size={14} strokeWidth={3}/>}
                    </div>
                  </div>

                  {formData.is_credit_card && (
                      <div className="mt-4 pt-4 border-t border-purple-500/10 animate-in fade-in slide-in-from-top-2 space-y-4" onClick={(e) => e.stopPropagation()}>
                           <div>
                               <label className="text-[10px] font-bold text-purple-300 uppercase mb-1.5 ml-1 flex items-center gap-1.5">
                                  <Wallet size={10}/> Limite do Cartão (R$)
                               </label>
                               <div className="relative">
                                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 font-bold text-sm">R$</span>
                                   <input 
                                        type="number" 
                                        step="0.01"
                                        value={formData.credit_limit} 
                                        onChange={(e) => setFormData({...formData, credit_limit: e.target.value})} 
                                        placeholder="0,00" 
                                        className="w-full rounded-lg border border-purple-500/30 bg-black/40 py-2.5 pl-9 pr-3 text-white focus:ring-1 focus:ring-purple-500 outline-none text-sm placeholder:text-zinc-600 font-bold"
                                   />
                               </div>
                           </div>

                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-purple-300 uppercase mb-1.5 ml-1 flex items-center gap-1.5">
                                  <CalendarClock size={10}/> Dia Fechamento
                                </label>
                                <input 
                                  type="number" 
                                  min="1" max="31"
                                  value={formData.closing_day} 
                                  onChange={(e) => setFormData({...formData, closing_day: e.target.value})}
                                  className="w-full rounded-lg border border-purple-500/30 bg-black/40 py-2.5 px-3 text-white focus:ring-1 focus:ring-purple-500 outline-none text-sm font-bold"
                                  placeholder="Ex: 5"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-purple-300 uppercase mb-1.5 ml-1 flex items-center gap-1.5">
                                  <CalendarClock size={10}/> Dia Vencimento
                                </label>
                                <input 
                                  type="number" 
                                  min="1" max="31"
                                  value={formData.due_day} 
                                  onChange={(e) => setFormData({...formData, due_day: e.target.value})}
                                  className="w-full rounded-lg border border-purple-500/30 bg-black/40 py-2.5 px-3 text-white focus:ring-1 focus:ring-purple-500 outline-none text-sm font-bold"
                                  placeholder="Ex: 12"
                                />
                              </div>
                           </div>
                      </div>
                  )}
              </div>

              <div className="flex gap-3 pt-2 shrink-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-white/10 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 font-medium transition-colors text-sm">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-95 text-sm flex items-center justify-center gap-2 group">
                    {editingAccount ? 'Salvar Alterações' : 'Criar'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}