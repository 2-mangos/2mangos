import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import CardsClient from './CardsClient'

export default async function CardsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // BUSCA DIRETAMENTE NA TABELA 'users'
  const { data: userData } = await supabase
    .from('users')
    .select('plano')
    .eq('id', user.id)
    .single()

  // BUSCA OS CARTÕES
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_credit_card', true)
    .order('order_index')

  // Garante que passamos o valor em minúsculo para evitar erros de comparação
  const userPlan = userData?.plano?.toLowerCase() || 'free'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Meus Cartões</h1>
        <p className="text-zinc-400 font-light">Gerenciamento exclusivo de faturas, limites e melhor dia de compra.</p>
      </div>

      <CardsClient 
        initialAccounts={(accounts as any) || []} 
        userPlan={userPlan as 'free' | 'premium'} 
      />
    </div>
  )
}