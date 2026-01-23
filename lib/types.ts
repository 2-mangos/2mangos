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
  parent_id?: string; // Adicionado para a lógica de recorrência
  recurrence_months?: number; // Adicionado
  is_fixed_value?: boolean; // Adicionado
  created_at?: string;
}

// O membro que estava faltando:
export interface CreateExpenseDTO {
  name: string;
  value: number;
  date: string;
  type: 'fixa' | 'variavel';
  status: 'pago' | 'pendente';
  is_credit_card: boolean;
  parent_id?: string;
  // Adicione estas duas linhas abaixo:
  recurrence_months?: number;
  is_fixed_value?: boolean;
}