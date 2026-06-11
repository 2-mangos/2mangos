'use client'

import { createClient } from '../../../lib/supabase' 
import { useToast } from '../../../components/ToastContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Wallet, Mail, Lock, User, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const { addToast } = useToast()
  
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth() {
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        addToast("Erro ao entrar: " + error.message, 'error')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      if (username.length < 3) { addToast("Nome de utilizador muito curto.", 'info'); setLoading(false); return }
      if (password !== confirmPassword) { addToast("As palavras-passe não coincidem.", 'error'); setLoading(false); return }
      if (password.length < 6) { addToast("Palavra-passe muito curta (min 6).", 'info'); setLoading(false); return }
      
      const cleanUsername = username.replace(/\s/g, '').toLowerCase()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: cleanUsername, plano: 'free' } }
      })

      if (error) {
        addToast("Erro ao registar: " + error.message, 'error')
      } else {
        addToast("Verifique o seu e-mail para confirmar!", 'success')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-4 relative overflow-hidden">
        
        {/* Efeitos de fundo FinTech */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-md space-y-8 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-8 sm:p-10 shadow-2xl relative z-10">
            
            {/* Header Login */}
            <div className="text-center">
                <div className="mx-auto w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(79,70,229,0.3)] ring-1 ring-indigo-500/50">
                    <Wallet size={28} strokeWidth={2.5}/>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                    {mode === 'login' ? 'Bem-vindo de volta' : 'Criar nova conta'}
                </h2>
                <p className="text-sm text-zinc-400 mt-2">
                    {mode === 'login' ? 'Insira as suas credenciais para aceder' : 'Junte-se a nós e organize a sua vida'}
                </p>
            </div>

            {/* Toggle Mode */}
            <div className="flex rounded-xl bg-zinc-950/80 p-1.5 border border-white/5">
                <button onClick={() => setMode('login')} className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${mode === 'login' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Entrar</button>
                <button onClick={() => setMode('register')} className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${mode === 'register' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Registar</button>
            </div>
            
            {/* Formulário */}
            <div className="space-y-5">
                
                {mode === 'register' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Utilizador</label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 pl-11 text-white font-medium focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-colors shadow-sm" placeholder="ex: joaosilva"/>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
                    <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 pl-11 text-white font-medium focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-colors shadow-sm" placeholder="seu@email.com"/>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Palavra-passe</label>
                    <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 pl-11 text-white font-medium focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-colors shadow-sm" placeholder="••••••••"/>
                    </div>
                </div>

                {mode === 'register' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Confirmar Palavra-passe</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 pl-11 text-white font-medium focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-colors shadow-sm" placeholder="••••••••"/>
                        </div>
                    </div>
                )}

                {mode === 'login' && (
                    <div className="text-right pt-1">
                        <Link href="/auth/forgot-password" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Esqueci a minha palavra-passe</Link>
                    </div>
                )}

                <button onClick={handleAuth} disabled={loading} className="w-full flex justify-center items-center gap-2 mt-4 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 text-sm">
                    {loading ? 'A processar...' : (
                        <>
                            {mode === 'login' ? 'Aceder ao Painel' : 'Criar Conta Gratuita'}
                            <ArrowRight size={16}/>
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
  )
}