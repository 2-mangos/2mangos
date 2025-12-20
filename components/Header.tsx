'use client'

import { Settings, User, LogOut, ChevronDown, Loader2 } from 'lucide-react'
import { createClient } from '../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function Header() {
  const [userName, setUserName] = useState('Usuário')
  const [userInitial, setUserInitial] = useState('U')
  const [userPlan, setUserPlan] = useState('Free')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null) // Novo estado para foto
  
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  // Fecha menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Função que busca os dados
  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
      setUserName(name)
      setUserInitial(name.charAt(0).toUpperCase())
      
      // Busca dados extras (Plano e Foto)
      const { data: userData } = await supabase.from('users').select('plano, avatar_url').eq('id', user.id).single()
      if (userData) {
        setUserPlan(userData.plano === 'premium' ? 'Premium' : 'Free')
        setAvatarUrl(userData.avatar_url) // Salva a foto
      }
    }
  }

  useEffect(() => {
    fetchUserData() // Busca inicial

    // Listener: Ouve o evento de atualização vindo do Perfil
    const handleProfileUpdate = () => {
        fetchUserData()
    }

    window.addEventListener('profile-updated', handleProfileUpdate)

    // Limpeza ao desmontar
    return () => {
        window.removeEventListener('profile-updated', handleProfileUpdate)
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-end px-8 sticky top-0 z-40">
      
      <div className="flex items-center gap-6">
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors">{userName}</p>
              <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">{userPlan}</p>
            </div>
            
            <div className="relative">
                {/* Lógica: Se tem foto mostra foto, senão mostra iniciais */}
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-900/20 ring-2 ring-[#09090b] group-hover:ring-indigo-500/50 transition-all overflow-hidden">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                    ) : (
                        userInitial
                    )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#09090b] rounded-full p-0.5">
                    <ChevronDown size={10} className="text-zinc-400" />
                </div>
            </div>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-3 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl py-1 animate-in fade-in zoom-in-95 origin-top-right">
              
              <div className="px-4 py-3 border-b border-white/5 sm:hidden">
                <p className="text-xs font-bold text-zinc-200">{userName}</p>
                <p className="text-[10px] text-zinc-500 uppercase">{userPlan}</p>
              </div>

              <div className="p-1">
                <Link 
                  href="/profile" 
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <User size={16} /> Meu Perfil
                </Link>
                
                <Link 
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Settings size={16} /> Configurações
                </Link>
              </div>

              <div className="h-px bg-white/5 my-1 mx-1"></div>

              <div className="p-1">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                >
                  <LogOut size={16} /> Sair da conta
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}