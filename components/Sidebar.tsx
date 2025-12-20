'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  List, 
  Wallet, 
  Tags, 
  TrendingUp
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  
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
        { name: 'Lançamentos', path: '/expenses', icon: List }, // Agora aponta para /expenses
        { name: 'Receitas', path: '/incomes', icon: TrendingUp },
      ]
    },
    {
      title: 'ORGANIZAÇÃO',
      items: [
        { name: 'Categorias', path: '/accounts', icon: Tags } // Aponta para /accounts conforme solicitado
      ]
    }
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#09090b] border-r border-white/5 flex flex-col z-50 text-zinc-400">
      
      {/* LOGO */}
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-2.5 text-zinc-100 font-semibold tracking-tight">
          <div className="flex items-center justify-center w-8 h-8 text-white rounded-lg shadow-lg shadow-indigo-500/20 bg-indigo-600">
            <Wallet size={16} strokeWidth={2.5} />
          </div>
          <span className="text-[15px]">Finance SaaS</span>
        </div>
      </div>

      {/* MENU DE NAVEGAÇÃO */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
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

      {/* RODAPÉ */}
      <div className="p-4 border-t border-white/5 text-center">
        <span className="text-[10px] text-zinc-600 font-medium">v1.0.0</span>
      </div>
    </aside>
  )
}