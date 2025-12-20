'use client'

import { createClient } from '../../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Save, Globe, Moon, Shield, Lock, Eye, EyeOff, Check, X, AlertTriangle, Trash2 } from 'lucide-react'
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

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando configurações...</div>

  return (
    <div className="min-h-screen p-8 pb-32 animate-in fade-in duration-500">
      <div className="mx-auto max-w-3xl space-y-8">
        
        <div className="mb-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Settings size={28} className="text-indigo-500" />
                Configurações
            </h1>
            <p className="text-zinc-400 mt-2 text-sm">Gerencie preferências, segurança e dados da conta.</p>
        </div>

        {/* --- BLOCO 1: GERAL --- */}
        <section className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">Geral</h3>
            
            <div className="card rounded-2xl p-8 border border-white/5 bg-[#09090b]">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Globe size={20} className="text-zinc-400"/> Localização e Moeda
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Moeda Principal</label>
                        <select 
                            value={currency} 
                            onChange={e => setCurrency(e.target.value)} 
                            className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            <option value="BRL">Real Brasileiro (BRL)</option>
                            <option value="USD">Dólar Americano (USD)</option>
                            <option value="EUR">Euro (EUR)</option>
                        </select>
                        <p className="text-[11px] text-zinc-500 mt-2">Esta moeda será utilizada em todos os dashboards.</p>
                    </div>
                </div>
                <div className="flex justify-end pt-6">
                    <button onClick={handleSaveSettings} disabled={loadingSavePref} className="flex items-center gap-2 px-6 py-2 bg-zinc-800 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition-all border border-white/5 disabled:opacity-50">
                        {loadingSavePref ? 'Salvando...' : 'Salvar Preferências'}
                    </button>
                </div>
            </div>

            <div className="card rounded-2xl p-8 border border-white/5 bg-[#09090b] relative overflow-hidden opacity-60">
                <div className="absolute top-4 right-4 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded border border-indigo-500/20">EM BREVE</div>
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Moon size={20} className="text-zinc-400"/> Aparência
                </h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-white">Modo Escuro</p>
                        <p className="text-xs text-zinc-500">O sistema se adapta automaticamente ao seu sistema.</p>
                    </div>
                    <div className="w-10 h-5 bg-zinc-700 rounded-full relative cursor-not-allowed"><div className="w-3 h-3 bg-zinc-400 rounded-full absolute right-1 top-1"></div></div>
                </div>
            </div>
        </section>

        {/* --- BLOCO 2: SEGURANÇA --- */}
        <section className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">Segurança</h3>
            
            <div className="card rounded-2xl p-8">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Shield size={20} className="text-indigo-500"/> Alterar Senha
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nova Senha</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={passwords.new}
                                    onChange={e => setPasswords({...passwords, new: e.target.value})}
                                    className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 pl-10 pr-10 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="••••••"
                                />
                                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Confirmar</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                                <input 
                                    type="password" 
                                    value={passwords.confirm}
                                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                    className={`w-full rounded-xl border bg-zinc-950 p-3 pl-10 text-sm text-white focus:ring-2 outline-none transition-all ${
                                        passwords.confirm && !passwordsMatch ? 'border-red-500/50 focus:ring-red-500' : 
                                        passwords.confirm && passwordsMatch ? 'border-emerald-500/50 focus:ring-emerald-500' : 
                                        'border-white/10 focus:ring-indigo-500'
                                    }`}
                                    placeholder="••••••"
                                />
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleChangePassword}
                            disabled={loadingPass || !passwords.new || !passwordsMatch || passwordStrength < 3}
                            className="w-full py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
                        >
                            {loadingPass ? 'Atualizando...' : 'Atualizar Senha'}
                        </button>
                    </div>

                    <div className="bg-white/5 rounded-xl p-5 border border-white/5 h-fit">
                        <h3 className="text-sm font-bold text-white mb-4">Requisitos</h3>
                        <ul className="space-y-3">
                            {passwordRequirements.map((req, idx) => (
                                <li key={idx} className={`flex items-center gap-3 text-xs font-medium transition-colors duration-200 ${req.met ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${req.met ? 'bg-emerald-500/20 border-emerald-500/30' : 'border-white/10 bg-white/5'}`}>
                                        {req.met && <Check size={12} strokeWidth={3}/>}
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
        <section className="space-y-4">
            <h3 className="text-sm font-bold text-red-400/80 uppercase tracking-wider ml-1">Zona de Perigo</h3>
            
            <div className={`card rounded-2xl p-8 relative overflow-hidden transition-all duration-300 ${isDeleting ? 'border-red-500/50 bg-red-500/5' : 'border-red-500/20 hover:border-red-500/40'}`}>
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                
                <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="p-4 bg-red-500/10 rounded-full text-red-500 shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    
                    <div className="flex-1 w-full">
                        <h2 className="text-lg font-bold text-white mb-1">Encerrar conta</h2>
                        <p className="text-sm text-zinc-400 mb-4">
                            Esta ação é irreversível. Todos os seus lançamentos e dados serão apagados permanentemente.
                        </p>

                        {isDeleting ? (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-red-400 uppercase mb-2">
                                    Para confirmar, digite <span className="select-all bg-red-500/20 px-1 rounded">ENCERRAR</span> abaixo:
                                </label>
                                <div className="flex gap-3">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        className="flex-1 rounded-xl border border-red-500/30 bg-zinc-950 p-2.5 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="ENCERRAR"
                                    />
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deleteConfirmation !== 'ENCERRAR' || loadingDelete}
                                        className="px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/20"
                                    >
                                        {loadingDelete ? 'Apagando...' : 'Confirmar'}
                                    </button>
                                    <button
                                        onClick={() => { setIsDeleting(false); setDeleteConfirmation('') }}
                                        className="px-4 py-2.5 border border-white/10 text-zinc-400 hover:text-white rounded-xl text-sm font-bold transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsDeleting(true)}
                                className="px-5 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2"
                            >
                                <Trash2 size={16}/> Encerrar Conta
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