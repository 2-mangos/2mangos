import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import CardsClient from './CardsClient'

export default async function CardsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ month?: string; year?: string }> 
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('plano')
    .eq('id', user.id)
    .single()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_credit_card', true)
    .order('order_index')

  const userPlan = userData?.plano?.toLowerCase() || 'free'

  return (
    <div className="p-6 space-y-6">
      <CardsClient 
        initialAccounts={(accounts as any) || []} 
        userPlan={userPlan as 'free' | 'premium'} 
      />
    </div>
  )
}