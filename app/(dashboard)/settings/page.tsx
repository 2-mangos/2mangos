'use client'

import { createClient } from '../../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, Globe, Moon, Shield, Lock, Eye, EyeOff, 
  Check, X, AlertTriangle, Trash2, ArrowRight, ShieldCheck, CreditCard
} from 'lucide-react'
import { useToast } from '../../../components/ToastContext'

export default function SettingsPage() {
  const { addToast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  
  // ESTADOS - PREFERÊNCIAS
  const [currency, setCurrency] = useState('BRL')
  const [loadingSavePref, setLoadingSavePref] = useState(false)

  // ESTADOS - SENHA
  const [passwords, setPasswords] = useState({ new: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [loadingPass, setLoadingPass] = useState(false)

  // ESTADOS - DELETAR
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [loadingDelete, setLoadingDelete] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { fetchSettings() }, [])

  // Validação de Senha
  const passwordRequirements = [
    { label: "Mínimo 6 caracteres", met: passwords.new.length >= 6 },
    { label: "Pelo menos um número", met: /[0-9]/.test(passwords.new) },
    { label: "Letra maiúscula", met: /[A-Z]/.test(passwords.new) },
  ]
  
  useEffect(() => {
    const metCount = passwordRequirements.filter(r => r.met).length
    setPasswordStrength(metCount)
  }, [passwords.new])
  
  const passwordsMatch = passwords.new && passwords.confirm && passwords.new === passwords.confirm

  async function fetchSettings() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const { data } = await supabase.from('users').select('currency').eq('id', user.id).single()
    if (data) setCurrency(data.currency || 'BRL')
    setLoading(false)
  }

  // AÇÕES
  async function handleSaveSettings() {
    if (!userId) return
    setLoadingSavePref(true)
    const { error } = await supabase.from('users').update({ 
        currency: currency,
        updated_at: new Date().toISOString()
    }).eq('id', userId)

    if (error) addToast("Erro ao salvar: " + error.message, 'error')
    else {
        addToast("Preferências salvas!", 'success')
        router.refresh()
    }
    setLoadingSavePref(false)
  }

  async function handleChangePassword() {
    if (!passwords.new) return addToast("Digite a nova senha.", 'info')
    if (passwords.new !== passwords.confirm) return addToast("As senhas não conferem.", 'error')
    
    setLoadingPass(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.new })

    if (error) addToast("Erro: " + error.message, 'error') 
    else {
      addToast("Senha atualizada com segurança!", 'success')
      setPasswords({ new: '', confirm: '' })
    }
    setLoadingPass(false)
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== 'ENCERRAR') {
        addToast("Digite ENCERRAR para confirmar.", 'error')
        return
    }
    if(!userId) return

    setLoadingDelete(true)
    const { error } = await supabase.from('users').delete().eq('id', userId)
    
    if (error) { 
        addToast("Erro ao deletar conta: " + error.message, 'error')
        setLoadingDelete(false)
    } else {
      await supabase.auth.signOut()
      addToast("Conta encerrada. Até logo.", 'info')
      router.push('/login')
    }
  }

  if (loading) {
      return (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
      )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20 pt-14 md:pt-0 overflow-x-hidden">
      
      {/* =========================================================
          HEADER PADRONIZADO
      ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Configurações</h1>
          <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2">
             <Settings size={14} className="text-indigo-400"/>
             Gerencie as suas preferências e a segurança da conta
          </p>
        </div>
      </div>

      <div className="space-y-8">

        {/* --- BLOCO 1: GERAL E PREFERÊNCIAS --- */}
        <section className="space-y-4">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Preferências Regionais</h3>
            
            <div className="card rounded-3xl p-6 sm:p-8 border border-white/5 bg-zinc-900/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>
                
                <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">Localização e Moeda</h2>
                        <p className="text-xs text-zinc-400">Defina como os valores serão exibidos nos dashboards.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Moeda Principal</label>
                        <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <select 
                                value={currency} 
                                onChange={e => setCurrency(e.target.value)} 
                                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 pl-11 text-sm font-semibold text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer transition-colors shadow-sm appearance-none"
                            >
                                <option value="BRL" className="bg-zinc-900">Real Brasileiro (R$)</option>
                                <option value="USD" className="bg-zinc-900">Dólar Americano ($)</option>
                                <option value="EUR" className="bg-zinc-900">Euro (€)</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Botão de Salvar Alinhado à Direita no Desktop */}
                    <div className="flex items-end justify-start md:justify-end">
                        <button 
                            onClick={handleSaveSettings} 
                            disabled={loadingSavePref} 
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-800 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition-all border border-white/5 disabled:opacity-50 shadow-md"
                        >
                            {loadingSavePref ? 'Salvando...' : 'Aplicar Preferências'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Card Aparência (Em Breve) */}
            <div className="card rounded-3xl p-6 sm:p-8 border border-white/5 bg-zinc-900/20 relative overflow-hidden opacity-70 cursor-not-allowed group">
                <div className="absolute top-6 right-6 bg-indigo-500/10 text-indigo-400 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md border border-indigo-500/20">EM BREVE</div>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800/50 rounded-xl border border-white/5 flex items-center justify-center text-zinc-500 shrink-0">
                        <Moon size={24} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-white tracking-tight">Aparência do Sistema</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Atualmente, o sistema adapta-se automaticamente ao modo escuro.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* --- BLOCO 2: SEGURANÇA E ACESSO --- */}
        <section className="space-y-4">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Segurança & Acesso</h3>
            
            <div className="card rounded-3xl p-6 sm:p-8 border border-white/5 bg-zinc-900/40 relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">Credenciais de Acesso</h2>
                        <p className="text-xs text-zinc-400">Atualize a sua palavra-passe regularmente para manter a conta segura.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 relative z-10">
                    
                    {/* Formulário de Senha */}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nova Senha</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"/>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={passwords.new}
                                    onChange={e => setPasswords({...passwords, new: e.target.value})}
                                    className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 pl-11 pr-11 text-sm font-semibold text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-colors shadow-sm"
                                    placeholder="••••••••"
                                />
                                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Confirmar Senha</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"/>
                                <input 
                                    type="password" 
                                    value={passwords.confirm}
                                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                    className={`w-full rounded-xl border bg-zinc-900/80 p-3.5 pl-11 text-sm font-semibold text-white focus:ring-1 outline-none transition-colors shadow-sm ${
                                        passwords.confirm && !passwordsMatch ? 'border-rose-500/50 focus:ring-rose-500' : 
                                        passwords.confirm && passwordsMatch ? 'border-emerald-500/50 focus:ring-emerald-500' : 
                                        'border-white/10 focus:ring-indigo-500'
                                    }`}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleChangePassword}
                            disabled={loadingPass || !passwords.new || !passwordsMatch || passwordStrength < 3}
                            className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 flex justify-center items-center gap-2 mt-2 active:scale-[0.98]"
                        >
                            {loadingPass ? 'Atualizando Segurança...' : <>{'Atualizar Credenciais'} <ArrowRight size={16}/></>}
                        </button>
                    </div>

                    {/* Requisitos Visuais */}
                    <div className="bg-zinc-950/50 rounded-2xl p-6 border border-white/5 h-fit shadow-inner">
                        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-5">Força da Senha</h3>
                        
                        {/* Barra de Progresso */}
                        <div className="flex gap-1.5 mb-6">
                            {[1, 2, 3].map((level) => (
                                <div 
                                  key={level} 
                                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                                      passwordStrength >= level 
                                      ? (passwordStrength === 3 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : passwordStrength === 2 ? 'bg-amber-500' : 'bg-rose-500') 
                                      : 'bg-zinc-800'
                                  }`} 
                                />
                            ))}
                        </div>

                        <ul className="space-y-4">
                            {passwordRequirements.map((req, idx) => (
                                <li key={idx} className={`flex items-center gap-3 text-xs font-bold transition-colors duration-300 ${req.met ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors duration-300 ${req.met ? 'bg-emerald-500/20 border-emerald-500/30' : 'border-white/10 bg-zinc-900'}`}>
                                        {req.met && <Check size={10} strokeWidth={4}/>}
                                    </div>
                                    {req.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        {/* --- BLOCO 3: ZONA DE PERIGO --- */}
        <section className="space-y-4 pt-4">
            <h3 className="text-[11px] font-bold text-rose-500 uppercase tracking-widest ml-1">Zona de Perigo</h3>
            
            <div className={`card rounded-3xl p-6 sm:p-8 relative overflow-hidden transition-all duration-500 ${isDeleting ? 'border-rose-500/50 bg-rose-500/5' : 'border-rose-500/20 bg-[#18181b] hover:border-rose-500/40'}`}>
                {/* Indicador Vermelho Lateral */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]"></div>
                
                <div className="flex flex-col md:flex-row items-start gap-6 ml-2">
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 shrink-0 shadow-sm">
                        <AlertTriangle size={28} />
                    </div>
                    
                    <div className="flex-1 w-full">
                        <h2 className="text-lg font-bold text-white mb-1 tracking-tight">Encerrar Conta Definitivamente</h2>
                        <p className="text-xs text-zinc-400 mb-6 leading-relaxed max-w-xl">
                            Esta ação é <strong className="text-zinc-300">100% irreversível</strong>. Todos os seus lançamentos, cartões, categorias e preferências serão apagados permanentemente dos nossos servidores.
                        </p>

                        {isDeleting ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 bg-zinc-950 p-5 rounded-2xl border border-rose-500/20">
                                <label className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-3">
                                    Para confirmar, digite <span className="select-all bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-300 border border-rose-500/30 mx-1">ENCERRAR</span> abaixo:
                                </label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        className="flex-1 rounded-xl border border-rose-500/30 bg-zinc-900 p-3.5 text-sm font-bold text-white focus:ring-1 focus:ring-rose-500 outline-none shadow-inner"
                                        placeholder="ENCERRAR"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setIsDeleting(false); setDeleteConfirmation('') }}
                                            className="px-5 py-3.5 border border-white/10 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all bg-zinc-800"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleDeleteAccount}
                                            disabled={deleteConfirmation !== 'ENCERRAR' || loadingDelete}
                                            className="px-6 py-3.5 bg-rose-600 text-white hover:bg-rose-500 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-rose-900/20 flex items-center gap-2"
                                        >
                                            <Trash2 size={16}/> {loadingDelete ? 'Apagando...' : 'Confirmar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsDeleting(true)}
                                className="px-6 py-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-rose-500/20 w-full sm:w-auto justify-center"
                            >
                                <Trash2 size={16}/> Quero encerrar a minha conta
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>

      </div>
    </div>
  )
}