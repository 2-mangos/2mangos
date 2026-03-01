// lib/types.ts

export interface Account {
  id: string;
  user_id: string;
  name: string;
  is_credit_card: boolean;
  color: string;
  icon: string;
  order_index: number;
  default_type: 'fixa' | 'variavel';
  credit_limit?: number;
  monthly_budget?: number;
  closing_day?: number;
  due_day?: number;
}

export interface Expense {
  id: string;
  user_id: string;
  name: string;
  value: number;
  date: string;
  type: 'fixa' | 'variavel';
  status: 'pago' | 'pendente';
  is_credit_card: boolean;
  parent_id?: string;
  recurrence_months?: number;
  is_fixed_value?: boolean;
  created_at?: string;
}

export interface CreateExpenseDTO {
  name: string;
  value: number;
  date: string;
  type: 'fixa' | 'variavel';
  status: 'pago' | 'pendente';
  is_credit_card: boolean;
  parent_id?: string;
  recurrence_months?: number;
  is_fixed_value?: boolean;
}

// Interface para Receitas (Incomes)
export interface Income {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  created_at?: string;
}

export interface CardTransaction {
  id: string;
  expense_id: string;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  installments_total?: number;
  installment_number?: number;
  created_at: string;
}