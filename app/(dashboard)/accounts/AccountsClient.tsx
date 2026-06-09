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

// --- CONFIGURAÇÕES E PALETA PREMIUM ---
const COLORS = [ 
  { hex: '#3b82f6', name: 'Azul' }, { hex: '#ef4444', name: 'Vermelho' }, 
  { hex: '#10b981', name: 'Verde' }, { hex: '#f59e0b', name: 'Laranja' }, 
  { hex: '#8b5cf6', name: 'Roxo' }, { hex: '#ec4899', name: 'Rosa' }, 
  { hex: '#6366f1', name: 'Indigo' }, { hex: '#71717a', name: 'Cinza' } 
]

const AVAILABLE_ICONS: { id: string, icon: LucideIcon, label: string }[] = [
    { id: 'wallet', icon: Wallet, label: 'Carteira' },
    { id: 'bank', icon: Landmark, label: 'Banco' },
    { id: 'card', icon: CreditCard, label: 'Cartão' },
    { id: 'piggy', icon: PiggyBank, label: 'Economia' },
    { id: 'home', icon: Home, label: 'Casa' },
    { id: 'food', icon: Utensils, label: 'Alimentação' },
    { id: 'shopping', icon: ShoppingBag, label: 'Compras' },
    { id: 'car', icon: Car, label: 'Carro' },
    { id: 'health', icon: Stethoscope, label: 'Saúde' },
    { id: 'education', icon: GraduationCap, label: 'Estudos' },
    { id: 'leisure', icon: Gamepad2, label: 'Lazer' },
]

// --- MOTOR DE AUTO-DETECT (Inteligência de UX) ---
const detectIconFromName = (name: string, isCreditCard: boolean): string => {
    const lower = name.toLowerCase()
    if (isCreditCard || lower.includes('cartão') || lower.includes('card') || lower.includes('nubank') || lower.includes('c6')) return 'card'
    if (lower.includes('banco') || lower.includes('bank') || lower.includes('itaú') || lower.includes('bradesco') || lower.includes('santander') || lower.includes('inter')) return 'bank'
    if (lower.includes('poupança') || lower.includes('reserva') || lower.includes('investimento') || lower.includes('cdb')) return 'piggy'
    if (lower.includes('casa') || lower.includes('aluguel') || lower.includes('moradia')) return 'home'
    if (lower.includes('comida') || lower.includes('alimentação') || lower.includes('restaurante') || lower.includes('ifood')) return 'food'
    if (lower.includes('mercado') || lower.includes('compra') || lower.includes('supermercado')) return 'shopping'
    if (lower.includes('carro') || lower.includes('uber') || lower.includes('gasolina') || lower.includes('transporte')) return 'car'
    if (lower.includes('saúde') || lower.includes('farmácia') || lower.includes('médico')) return 'health'
    if (lower.includes('escola') || lower.includes('curso') || lower.includes('faculdade')) return 'education'
    if (lower.includes('lazer') || lower.includes('cinema') || lower.includes('jogo') || lower.includes('netflix')) return 'leisure'
    return 'wallet'
}

const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)].hex;

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
    opacity: isDragging ? 0.8 : 1, 
    position: 'relative' as const 
  }

  return (
    <li ref={setNodeRef} style={style} className="group relative list-none">
        <div className={`
            flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all duration-200
            ${isOpen ? 'bg-zinc-800 border-indigo-500/30 shadow-lg' : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/80'}
            ${isDragging ? 'shadow-2xl ring-2 ring-indigo-500/50 cursor-grabbing bg-zinc-800' : ''}
        `}>
            <div className="flex items-center gap-3 sm:gap-4 flex-1 overflow-hidden">
                <div 
                    {...attributes} 
                    {...listeners} 
                    className="text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing p-1.5 sm:p-1 touch-none transition-colors"
                >
                    <GripVertical size={18} />
                </div>
                
                <div 
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white shadow-inner shrink-0 relative overflow-hidden" 
                    style={{ backgroundColor: account.color || '#3b82f6' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
                    <div className="relative z-10 drop-shadow-md">
                       <AccountIconDisplay iconId={account.icon} size={20} />
                    </div>
                </div>

                <div className="flex flex-col min-w-0 justify-center">
                    <span className="font-bold text-zinc-100 text-sm truncate">{account.name}</span>
                    
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            account.default_type === 'fixa' 
                            ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        }`}>
                           {account.default_type === 'fixa' ? 'Recorrente' : 'Variável'}
                        </span>

                        {account.is_credit_card && (
                             <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                                 <CreditCard size={10}/> Cartão
                             </span>
                        )}

                        {account.is_credit_card && (account.credit_limit || 0) > 0 && (
                             <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-white/5">
                                 Lim: <strong className="text-zinc-300">{formatCurrency(account.credit_limit || 0)}</strong>
                             </span>
                        )}

                        {(account.monthly_budget || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-white/5">
                                Meta: <strong className="text-zinc-300">{formatCurrency(account.monthly_budget || 0)}</strong>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative ml-2 shrink-0">
                <button 
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(isOpen ? null : account.id) }} 
                    className={`p-2 rounded-xl transition-colors ${isOpen ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                >
                    <MoreVertical size={18}/>
                </button>
                
                {isOpen && (
                    <div ref={menuRef} className="absolute right-0 top-full mt-2 w-36 bg-zinc-800 rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-50 py-1">
                        <button onClick={() => openEditModal(account)} className="flex w-full items-center px-4 py-2.5 text-xs text-zinc-200 hover:bg-white/5 transition-colors font-medium">
                            <Edit3 size={14} className="mr-2" /> Editar
                        </button>
                        <div className="h-px bg-white/5 mx-2 my-0.5"></div>
                        <button onClick={() => handleDelete(account.id)} className="flex w-full items-center px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors font-medium">
                            <Trash2 size={14} className="mr-2" /> Excluir
                        </button>
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

  // Auto-Update Icon whenever name changes
  useEffect(() => {
     if (formData.name) {
         setFormData(prev => ({
             ...prev,
             icon: detectIconFromName(prev.name, prev.is_credit_card)
         }))
     }
  }, [formData.name, formData.is_credit_card])

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
    try {
      const updatePromises = updatedAccounts.map((acc, index) => 
        supabase.from('accounts').update({ order_index: index }).eq('id', acc.id)
      )
      await Promise.all(updatePromises)
      router.refresh()
    } catch (err) {
      console.error("Erro ao salvar ordenação:", err)
      addToast("Não foi possível salvar a nova ordem.", 'error')
    }
  }

  function openNewModal() { 
      setEditingAccount(null)
      setFormData({ 
        name: '', 
        is_credit_card: false, 
        color: getRandomColor(), // Auto-Select Color
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
          color: account.color || getRandomColor(),
          credit_limit: account.credit_limit ? account.credit_limit.toString() : '',
          monthly_budget: account.monthly_budget ? account.monthly_budget.toString() : '',
          icon: account.icon || detectIconFromName(account.name, account.is_credit_card),
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
      const { error: errAccount } = await supabase.from('accounts').update(payload).eq('id', editingAccount.id)
      error = errAccount

      if (!error && editingAccount.name !== formData.name) {
          await supabase.from('expenses').update({ name: formData.name }).eq('user_id', user.id).eq('name', editingAccount.name)
      }
    } else {
      let newIndex = accounts.length
      const { error: err } = await supabase.from('accounts').insert({ user_id: user.id, order_index: newIndex, ...payload })
      error = err
    }

    if (error) addToast("Erro: " + error.message, 'error')
    else {
        addToast(editingAccount ? "Atualizado com sucesso!" : "Categoria criada com sucesso!", 'success')
        setIsModalOpen(false)
        router.refresh()
    }
}

  async function handleDelete(id: string) { 
    if (!confirm('Atenção: Isso excluirá as movimentações vinculadas a esta conta. Continuar?')) return
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) addToast("Erro ao excluir", 'error')
    else {
        addToast("Conta excluída", 'success')
        router.refresh()
    }
  }

  const filteredAccounts = accounts.filter(acc => acc.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 animate-in fade-in duration-500">
        
        {/* HEADER PADRONIZADO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-14 md:pt-0 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Categorias</h1>
            <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2">
                <Layers size={14} className="text-indigo-400"/>
                Gerencie categorias e limites orçamentais
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
             <div className="relative group flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-white transition-colors" size={16} />
                <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    placeholder="Filtrar categorias..." 
                    className="w-full rounded-lg border border-white/10 bg-zinc-900/80 py-2.5 pl-10 pr-4 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600"
                />
             </div>
             
             <button 
                onClick={openNewModal} 
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 text-sm font-bold transition-all active:scale-95 whitespace-nowrap shrink-0"
             >
                <Plus size={18}/> Nova Categoria
             </button>
          </div>
        </div>

        {/* LISTA DE CONTAS COM DND */}
        <div className="flex flex-col gap-4">
          {filteredAccounts.length === 0 ? (
              <div className="card rounded-2xl p-10 sm:p-12 text-center flex flex-col items-center justify-center border border-dashed border-white/10 bg-zinc-900/20">
                  <div className="bg-zinc-900 p-4 rounded-full mb-4 ring-1 ring-white/10">
                    <Tag size={32} className="text-zinc-600"/>
                  </div>
                  <h3 className="text-zinc-300 font-bold mb-2">Organização é tudo</h3>
                  <p className="text-zinc-500 text-sm max-w-sm mb-6">Crie categorias para agrupar seus lançamentos e acompanhe os orçamentos de forma inteligente.</p>
                  <button onClick={openNewModal} className="text-indigo-400 text-sm font-bold hover:bg-indigo-500/10 px-4 py-2 rounded-lg transition-colors">
                    Criar minha primeira categoria
                  </button>
              </div>
          ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filteredAccounts.map(a => a.id)} strategy={verticalListSortingStrategy}>
                      <ul className="grid gap-3 sm:gap-4 p-1">
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

      {/* MODAL RESPONSIVO COM AUTO-DETECT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#18181b] rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-6 sm:p-8 pb-4 border-b border-white/5 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                            {editingAccount ? <Edit3 size={20}/> : <Plus size={20}/>}
                        </div>
                        {editingAccount ? 'Editar Categoria' : 'Nova Categoria'}
                    </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto custom-scrollbar">
              
              {/* 1. NOME (Com ícone Auto-Detect renderizado lado a lado) */}
              <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Nome da Categoria</label>
                    <input 
                        autoFocus 
                        required 
                        type="text" 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        placeholder="Ex: Supermercado, Nubank..." 
                        className="w-full rounded-xl border border-white/10 bg-zinc-900/50 p-3.5 text-white focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
                    />
                  </div>
                  {/* Ícone dinâmico baseado no nome */}
                  <div className="shrink-0 h-[46px] w-[46px] rounded-xl flex items-center justify-center text-white shadow-inner mb-0.5 border border-white/10 transition-colors" style={{ backgroundColor: formData.color }}>
                      <AccountIconDisplay iconId={formData.icon} size={22} />
                  </div>
              </div>
              
              {/* 2. TIPO E CORES (Grid no Desktop, Stack no Mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tipo Padrão</label>
                     <div className="flex gap-2">
                         <button type="button" onClick={() => setFormData({...formData, default_type: 'variavel'})} className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${formData.default_type === 'variavel' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300'}`}>
                             <Zap size={14} /> Variável
                         </button>
                         <button type="button" onClick={() => setFormData({...formData, default_type: 'fixa'})} className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${formData.default_type === 'fixa' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300'}`}>
                             <CalendarClock size={14} /> Recorrente
                         </button>
                     </div>
                  </div>

                  {/* Cores simplificadas - Sem custom color picker */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Cor Temática</label>
                    <div className="flex flex-wrap gap-2.5 items-center bg-zinc-900/30 p-2.5 rounded-xl border border-white/5 h-[46px]">
                        {COLORS.map((color) => (
                            <button 
                                key={color.hex} 
                                type="button" 
                                onClick={() => setFormData({...formData, color: color.hex})} 
                                className={`h-6 w-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${formData.color === color.hex ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#18181b] scale-110' : 'opacity-60 hover:opacity-100'}`} 
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                            >
                                {formData.color === color.hex && <Check size={12} className="text-white drop-shadow-md"/>}
                            </button>
                        ))}
                    </div>
                  </div>
              </div>
              
              {/* 3. META MENSAL */}
              <div className="space-y-2 bg-zinc-900/30 p-4 rounded-xl border border-white/5">
                 <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-white/5"><Target size={14} className="text-zinc-300"/></div>
                    <div>
                        <label className="text-xs font-bold text-zinc-200">Meta de Gasto Mensal</label>
                        <p className="text-[10px] text-zinc-500">Defina um teto para orçamento</p>
                    </div>
                 </div>
                 <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">R$</span>
                       <input 
                           type="number" step="0.01"
                           value={formData.monthly_budget} 
                           onChange={(e) => setFormData({...formData, monthly_budget: e.target.value})} 
                           placeholder="Ex: 500,00" 
                           className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-3 pl-9 pr-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none text-sm placeholder:text-zinc-700 font-bold transition-all"
                       />
                 </div>
              </div>

              {/* 4. MÓDULO DE CARTÃO DE CRÉDITO (Ativação e Expansão) */}
              <div className="space-y-3">
                  <div 
                    onClick={() => setFormData({...formData, is_credit_card: !formData.is_credit_card})}
                    className={`
                        relative overflow-hidden cursor-pointer rounded-xl border p-4 transition-all duration-300
                        ${formData.is_credit_card ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/30' : 'bg-zinc-900/30 border-white/5 hover:border-white/10 hover:bg-zinc-900/50'}
                    `}
                  >
                     <div className="flex items-center gap-4 relative z-10">
                        <div className={`p-3 rounded-xl transition-colors ${formData.is_credit_card ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                            <CreditCard size={20}/>
                        </div>
                        <div className="flex-1">
                            <span className={`text-sm font-bold block mb-0.5 ${formData.is_credit_card ? 'text-white' : 'text-zinc-300'}`}>Cartão de Crédito</span>
                            <span className="text-[10px] text-zinc-500 leading-tight block">Habilita gestão de limite e faturas.</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${formData.is_credit_card ? 'bg-purple-500 border-purple-400 text-white' : 'border-zinc-700 bg-zinc-900'}`}>
                            {formData.is_credit_card && <Check size={14} strokeWidth={3}/>}
                        </div>
                     </div>

                     {/* Campos que expandem se for Cartão */}
                     {formData.is_credit_card && (
                         <div className="mt-5 pt-5 border-t border-purple-500/10 animate-in fade-in slide-in-from-top-2 space-y-4" onClick={(e) => e.stopPropagation()}>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Limite do Cartão</label>
                                  <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300/50 font-bold text-sm">R$</span>
                                      <input 
                                          type="number" step="0.01" value={formData.credit_limit} onChange={(e) => setFormData({...formData, credit_limit: e.target.value})} placeholder="0,00" 
                                          className="w-full rounded-xl border border-purple-500/30 bg-black/40 py-3 pl-9 pr-3 text-white focus:ring-1 focus:ring-purple-500 outline-none text-sm font-bold"
                                      />
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                   <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Fechamento</label>
                                   <input type="number" min="1" max="31" value={formData.closing_day} onChange={(e) => setFormData({...formData, closing_day: e.target.value})} placeholder="Ex: 5" className="w-full rounded-xl border border-purple-500/30 bg-black/40 py-3 px-3 text-white focus:ring-1 focus:ring-purple-500 outline-none text-sm font-bold text-center"/>
                                 </div>
                                 <div className="space-y-2">
                                   <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Vencimento</label>
                                   <input type="number" min="1" max="31" value={formData.due_day} onChange={(e) => setFormData({...formData, due_day: e.target.value})} placeholder="Ex: 12" className="w-full rounded-xl border border-purple-500/30 bg-black/40 py-3 px-3 text-white focus:ring-1 focus:ring-purple-500 outline-none text-sm font-bold text-center"/>
                                 </div>
                              </div>
                         </div>
                     )}
                  </div>
              </div>

              {/* Botões Base Modal */}
              <div className="flex gap-3 pt-2 shrink-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 border border-white/10 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 font-bold transition-colors text-sm">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-95 text-sm flex items-center justify-center gap-2 group">
                    {editingAccount ? 'Salvar' : 'Criar Categoria'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}