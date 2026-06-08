'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { 
  LayoutDashboard, 
  List, 
  Wallet, 
  Tags, 
  TrendingUp,
  CreditCard,
  Settings,
  Menu,
  X
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  
  if (pathname === '/login' || pathname === '/') {
    return null
  }

  const navSections = [
    {
      title: 'PRINCIPAL',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'MOVIMENTAÇÕES',
      items: [
        { name: 'Lançamentos', path: '/expenses', icon: List },
        { name: 'Cartões', path: '/cards', icon: CreditCard },
        { name: 'Receitas', path: '/incomes', icon: TrendingUp },
      ]
    },
    {
      title: 'ORGANIZAÇÃO',
      items: [
        { name: 'Categorias', path: '/accounts', icon: Tags }
      ]
    }
  ]

  return (
    <>
      {/* BOTÃO HAMBÚRGUER FIXADO NA BARRA DO HEADER OU CANTO SUPERIOR */}
      <div className="fixed top-3 left-4 z-50 md:hidden flex items-center h-10">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-[#18181b] border border-white/10 text-zinc-200 hover:text-white transition-colors focus:outline-none"
          aria-label="Alternar Menu"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* OVERLAY ESCURO PARA BLOQUEAR O CONTEÚDO AO FUNDO NO MOBILE */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* SIDEBAR ASIDE - CONTROLADA POR CLASSES ULTRA-ESTRUTURAIS */}
      <aside className={`
        fixed left-0 top-0 h-screen w-[240px] bg-[#09090b] border-r border-white/5 flex flex-col z-40 text-zinc-400
        transition-all duration-300 ease-in-out
        ${isOpen 
          ? 'translate-x-0 w-[240px] shadow-2xl block' 
          : '-translate-x-full md:translate-x-0 hidden md:flex'
        }
      `}>
        
        {/* LOGO AREA */}
        <div className="h-16 flex items-center px-6 pl-16 md:pl-6 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5 text-zinc-100 font-semibold tracking-tight">
            <div className="flex items-center justify-center w-8 h-8 text-white rounded-lg shadow-lg shadow-indigo-500/20 bg-indigo-600">
              <Wallet size={16} strokeWidth={2.5} />
            </div>
            <span className="text-[15px]">2mangos</span>
          </div>
        </div>

        {/* NAVEGAÇÃO INTERNA COM SCROLL SEPARADO */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8 custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                {section.title}
              </h3>
              
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.path
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`
                          group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                          ${isActive ? 'text-white bg-white/5 border border-white/5' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'}
                        `}
                      >
                        <item.icon 
                          size={16} 
                          strokeWidth={2}
                          className={`transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} 
                        />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* CONFIGURAÇÕES NO RODAPÉ */}
        <div className="p-3 border-t border-white/5 shrink-0">
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className={`
              group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
              ${pathname === '/settings' ? 'text-white bg-white/5 border border-white/5' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'}
            `}
          >
            <Settings 
              size={16} 
              strokeWidth={2}
              className={`transition-colors ${pathname === '/settings' ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} 
            />
            Configurações
          </Link>
        </div>
      </aside>
    </>
  )
}