import { supabase, unwrap } from '@/lib/supabase'
import type {
  CashMovement,
  CashRegister,
  CloseRegisterResult,
  DailyCashRow,
  Payment,
  PaymentMethod,
} from '@/types'

export async function getOpenRegister() {
  const rows = await unwrap<CashRegister[]>(
    supabase
      .from('cash_registers')
      .select('*')
      .eq('status', 'open')
      .limit(1),
  )
  return rows[0] ?? null
}

export async function listRegisters(limit = 30) {
  return unwrap<CashRegister[]>(
    supabase
      .from('cash_registers')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(limit),
  )
}

export async function listRegisterPayments(registerId: string) {
  return unwrap<Payment[]>(
    supabase
      .from('payments')
      .select('*')
      .eq('cash_register_id', registerId)
      .order('paid_at', { ascending: false }),
  )
}

export async function listRegisterMovements(registerId: string) {
  return unwrap<CashMovement[]>(
    supabase
      .from('cash_movements')
      .select('*')
      .eq('cash_register_id', registerId)
      .order('moved_at', { ascending: false }),
  )
}

export async function openCashRegister(openingAmount: number) {
  return unwrap<string>(
    supabase.rpc('open_cash_register', { p_opening_amount: openingAmount }),
  )
}

export async function registerCashMovement(input: {
  movementType: 'expense' | 'withdrawal' | 'deposit' | 'other_income'
  amount: number
  paymentMethod: PaymentMethod
  description: string
}) {
  return unwrap<string>(
    supabase.rpc('register_cash_movement', {
      p_movement_type: input.movementType,
      p_amount: input.amount,
      p_payment_method: input.paymentMethod,
      p_description: input.description,
    }),
  )
}

export async function closeCashRegister(countedCash: number, notes?: string) {
  return unwrap<CloseRegisterResult>(
    supabase.rpc('close_cash_register', {
      p_counted_cash: countedCash,
      p_notes: notes ?? null,
    }),
  )
}

export async function listDailyCashSummary(from: string, to: string) {
  return unwrap<DailyCashRow[]>(
    supabase
      .from('v_daily_cash_summary')
      .select('*')
      .gte('day', from)
      .lte('day', to)
      .order('day', { ascending: false }),
  )
}
