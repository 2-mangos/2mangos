'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateCardSettings(accountId: string, data: {
  credit_limit?: number
  closing_day?: number
  due_day?: number
}) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('accounts')
    .update(data)
    .eq('id', accountId)

  if (error) {
    console.error("Erro ao atualizar conta:", error.message)
    throw new Error(error.message)
  }
  
  revalidatePath('/cards')
}