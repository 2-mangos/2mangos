// lib/types.ts

export interface UserProfile {
  id: string
  email: string
  username: string
  full_name?: string
  phone?: string
  avatar_url?: string
  plano: 'free' | 'premium'
  currency: string
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  color: string
  is_credit_card: boolean
  credit_limit?: number 
  order_index: number
  default_type: 'fixa' | 'variavel'
  icon?: string 
  monthly_budget?: number 
  closing_day?: number 
  due_day?: number     
  created_at?: string
}

export interface Expense {
  id: string
  user_id: string
  name: string // Nome da conta vinculada
  value: number
  date: string
  type: 'fixa' | 'variavel'
  status: 'pago' | 'pendente'
  is_credit_card: boolean
  created_at?: string
}