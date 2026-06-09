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
      {/* BOTÃO HAMBÚRGUER FIXADO NO MOBILE */}
      <div className="fixed top-3 left-4 z-50 md:hidden flex items-center h-10">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-[#18181b] border border-white/10 text-zinc-200 hover:text-white transition-colors focus:outline-none shadow-md"
          aria-label="Alternar Menu"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* OVERLAY ESCURO PARA MOBILE */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* SIDEBAR EXPANSÍVEL - Controlada pelo group/sidebar no desktop */}
      <aside className={`
        fixed left-0 top-0 h-screen bg-[#09090b] border-r border-white/5 flex flex-col z-50 text-zinc-400
        transition-all duration-300 ease-in-out group/sidebar overflow-hidden
        ${isOpen 
          ? 'translate-x-0 w-[240px] shadow-2xl block' 
          : '-translate-x-full md:translate-x-0 md:w-[80px] hover:md:w-[240px] hidden md:flex hover:shadow-2xl hover:border-white/10'
        }
      `}>
        
        {/* LOGO AREA */}
        <div className="h-16 flex items-center pl-6 border-b border-white/5 shrink-0 whitespace-nowrap overflow-hidden">
          <div className="flex items-center text-zinc-100 font-semibold tracking-tight">
            <div className="flex items-center justify-center w-8 h-8 text-white rounded-lg shadow-lg shadow-indigo-500/20 bg-indigo-600 shrink-0">
              <Wallet size={16} strokeWidth={2.5} />
            </div>
            <span className={`text-[15px] transition-all duration-300 overflow-hidden ${
              isOpen ? 'opacity-100 ml-3 max-w-[150px]' : 'opacity-0 max-w-0 ml-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:ml-3 md:group-hover/sidebar:max-w-[150px]'
            }`}>
              2mangos
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO INTERNA COM SCROLL SEPARADO */}
        <nav className="flex-1 overflow-y-auto py-6 space-y-8 custom-scrollbar overflow-x-hidden">
          {navSections.map((section, idx) => (
            <div key={idx}>
              
              {/* TÍTULO DA SECÇÃO (Linha no modo Slim, Texto no modo Expandido) */}
              <div className="relative h-4 mb-2 flex items-center">
                 {/* Linha Divisória (Modo Colapsado) */}
                 <div className={`absolute left-7 w-6 h-px bg-white/10 transition-all duration-300 ${
                    isOpen ? 'opacity-0' : 'opacity-100 md:group-hover/sidebar:opacity-0'
                 }`} />
                 
                 {/* Texto do Título (Modo Expandido) */}
                 <h3 className={`absolute left-[60px] text-[10px] font-bold text-zinc-500 uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                    isOpen ? 'opacity-100' : 'opacity-0 md:group-hover/sidebar:opacity-100'
                 }`}>
                   {section.title}
                 </h3>
              </div>
              
              <ul className="space-y-1 px-3">
                {section.items.map((item) => {
                  const isActive = pathname === item.path
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`
                          group/link flex items-center px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 whitespace-nowrap overflow-hidden
                          ${isActive ? 'text-white bg-white/10 border border-white/5 shadow-sm' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'}
                        `}
                      >
                        <item.icon 
                          size={16} 
                          strokeWidth={2}
                          className={`shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover/link:text-zinc-300'}`} 
                        />
                        <span className={`transition-all duration-300 overflow-hidden ${
                          isOpen ? 'opacity-100 ml-3 max-w-[150px]' : 'opacity-0 max-w-0 ml-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:ml-3 md:group-hover/sidebar:max-w-[150px]'
                        }`}>
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* CONFIGURAÇÕES NO RODAPÉ */}
        <div className="p-3 border-t border-white/5 shrink-0 overflow-hidden">
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className={`
              group/link flex items-center px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 whitespace-nowrap
              ${pathname === '/settings' ? 'text-white bg-white/10 border border-white/5 shadow-sm' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'}
            `}
          >
            <Settings 
              size={16} 
              strokeWidth={2}
              className={`shrink-0 transition-colors ${pathname === '/settings' ? 'text-indigo-400' : 'text-zinc-500 group-hover/link:text-zinc-300'}`} 
            />
            <span className={`transition-all duration-300 overflow-hidden ${
               isOpen ? 'opacity-100 ml-3 max-w-[150px]' : 'opacity-0 max-w-0 ml-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:ml-3 md:group-hover/sidebar:max-w-[150px]'
            }`}>
              Configurações
            </span>
          </Link>
        </div>

      </aside>
    </>
  )
}