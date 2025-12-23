// lib/types.ts

// --- USUÁRIO ---
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

// --- CONTAS / CATEGORIAS ---
export interface Account {
  id: string
  user_id: string
  name: string
  color: string
  is_credit_card: boolean
  credit_limit?: number 
  order_index: number
  
  // NOVO CAMPO: Define o comportamento padrão ao selecionar esta conta
  default_type: 'fixa' | 'variavel'
  
  icon?: string // Garanti que o ícone está tipado aqui também
  created_at?: string
}

// --- DESPESAS (Lançamentos) ---
export type ExpenseType = 'fixa' | 'variavel'
export type ExpenseStatus = 'pago' | 'pendente'

export interface Expense {
  id: string
  user_id: string
  name: string
  value: number
  date: string
  type: ExpenseType
  status: ExpenseStatus
  
  is_credit_card: boolean
  
  is_fixed_value?: boolean
  recurrence_months?: number
  parent_id?: string
  
  created_at?: string
}

export type CreateExpenseDTO = Omit<Expense, 'id' | 'created_at' | 'user_id'>

// --- TRANSAÇÕES DO CARTÃO ---
export interface CardTransaction {
  id: string
  expense_id: string
  description: string
  amount: number
  category: string
  created_at: string
}

// --- RECEITAS ---
export interface Income {
  id: string
  user_id: string
  description: string
  amount: number
  date: string
  created_at?: string
}

// ... imports

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
  
  // NOVO CAMPO
  monthly_budget?: number 
  
  created_at?: string
}