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

      {/* SIDEBAR STRICT COLLAPSED (Ícones com Tooltips no Desktop) */}
      <aside className={`
        fixed left-0 top-0 h-screen bg-[#09090b] border-r border-white/5 flex flex-col z-50 text-zinc-400
        transition-transform duration-300 ease-in-out
        ${isOpen 
          ? 'translate-x-0 w-[240px] shadow-2xl block' 
          : '-translate-x-full md:translate-x-0 md:w-[80px] hidden md:flex'
        }
      `}>
        
        {/* LOGO AREA */}
        <div className={`h-16 flex items-center border-b border-white/5 shrink-0 ${isOpen ? 'pl-6' : 'justify-center'}`}>
          {/* Logo Extensa (Mobile) */}
          <div className={`items-center text-zinc-100 font-semibold tracking-tight ${isOpen ? 'flex' : 'hidden'}`}>
            <div className="flex items-center justify-center w-8 h-8 text-white rounded-lg shadow-lg shadow-indigo-500/20 bg-indigo-600 shrink-0">
              <Wallet size={16} strokeWidth={2.5} />
            </div>
            <span className="ml-3 text-[15px]">2mangos</span>
          </div>

          {/* Logo Ícone Único (Desktop) */}
          <div className={`items-center justify-center w-10 h-10 text-white rounded-xl shadow-lg shadow-indigo-500/20 bg-indigo-600 shrink-0 cursor-pointer hover:scale-105 transition-transform ${isOpen ? 'hidden' : 'flex'}`}>
             <Wallet size={20} strokeWidth={2.5} />
          </div>
        </div>

        {/* NAVEGAÇÃO INTERNA (Com md:overflow-visible para permitir que o Tooltip saia da barra) */}
        <nav className="flex-1 py-6 space-y-8 overflow-y-auto overflow-x-hidden md:overflow-visible custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className={`flex flex-col ${isOpen ? 'items-stretch' : 'items-center'}`}>
              
              {/* TÍTULO DA SECÇÃO */}
              {isOpen ? (
                 <h3 className="px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                   {section.title}
                 </h3>
              ) : (
                 <div className="w-5 h-px bg-white/10 mb-3" />
              )}
              
              <ul className={`space-y-1.5 ${isOpen ? 'px-3' : 'px-0'}`}>
                {section.items.map((item) => {
                  const isActive = pathname === item.path
                  return (
                    <li key={item.path} className="relative group/tooltip">
                      <Link
                        href={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`
                          flex items-center transition-all duration-200
                          ${isOpen 
                             ? 'px-4 py-2.5 rounded-xl gap-3 w-full' 
                             : 'justify-center w-11 h-11 rounded-xl mx-auto'
                          }
                          ${isActive 
                             ? 'text-white bg-white/10 border border-white/5 shadow-sm' 
                             : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                          }
                        `}
                      >
                        <item.icon 
                          size={isOpen ? 18 : 20} 
                          strokeWidth={2}
                          className={`shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover/tooltip:text-zinc-300'}`} 
                        />
                        {/* Texto (Visível apenas no Mobile Aberto) */}
                        {isOpen && <span className="font-medium text-[13px]">{item.name}</span>}
                      </Link>

                      {/* TOOLTIP FLUTUANTE (Visível apenas no Desktop Collapsed) */}
                      {!isOpen && (
                         <div className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-800 text-white text-xs font-semibold rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap shadow-xl border border-white/10">
                            {item.name}
                            {/* Setinha apontando para o ícone */}
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[5px] border-transparent border-r-zinc-800"></div>
                         </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* CONFIGURAÇÕES NO RODAPÉ */}
        <div className={`p-3 border-t border-white/5 shrink-0 ${isOpen ? '' : 'flex justify-center'} md:overflow-visible`}>
           <div className="relative group/tooltip w-full">
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center transition-all duration-200
                  ${isOpen 
                     ? 'px-4 py-2.5 rounded-xl gap-3 w-full' 
                     : 'justify-center w-11 h-11 rounded-xl mx-auto'
                  }
                  ${pathname === '/settings' 
                     ? 'text-white bg-white/10 border border-white/5 shadow-sm' 
                     : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                  }
                `}
              >
                <Settings 
                  size={isOpen ? 18 : 20} 
                  strokeWidth={2}
                  className={`shrink-0 transition-colors ${pathname === '/settings' ? 'text-indigo-400' : 'text-zinc-500 group-hover/tooltip:text-zinc-300'}`} 
                />
                {isOpen && <span className="font-medium text-[13px]">Configurações</span>}
              </Link>

              {/* TOOLTIP DE CONFIGURAÇÕES */}
              {!isOpen && (
                 <div className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-800 text-white text-xs font-semibold rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap shadow-xl border border-white/10">
                    Configurações
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[5px] border-transparent border-r-zinc-800"></div>
                 </div>
              )}
           </div>
        </div>

      </aside>
    </>
  )
}