import { supabase, unwrap } from '@/lib/supabase'
import type {
  Customer,
  CustomerNote,
  Payment,
  RepairOrder,
  Sale,
} from '@/types'

export async function listCustomers(options: {
  search?: string
  includeInactive?: boolean
} = {}) {
  let query = supabase.from('customers').select('*').order('full_name')
  if (!options.includeInactive) query = query.eq('is_active', true)
  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`
    query = query.or(`full_name.ilike.${term},phone.ilike.${term},whatsapp.ilike.${term},email.ilike.${term}`)
  }
  return unwrap<Customer[]>(query)
}

export async function getCustomer(id: string) {
  return unwrap<Customer>(
    supabase.from('customers').select('*').eq('id', id).single(),
  )
}

export interface CustomerInput {
  full_name: string
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  notes?: string | null
  is_active: boolean
}

export async function createCustomer(input: CustomerInput) {
  return unwrap<Customer>(
    supabase.from('customers').insert(input).select('*').single(),
  )
}

export async function updateCustomer(id: string, input: CustomerInput) {
  return unwrap<Customer>(
    supabase.from('customers').update(input).eq('id', id).select('*').single(),
  )
}

export async function listCustomerNotes(customerId: string) {
  return unwrap<CustomerNote[]>(
    supabase
      .from('customer_notes')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  )
}

export async function addCustomerNote(customerId: string, note: string) {
  return unwrap<CustomerNote>(
    supabase
      .from('customer_notes')
      .insert({ customer_id: customerId, note })
      .select('*')
      .single(),
  )
}

export interface CustomerHistory {
  sales: Sale[]
  orders: RepairOrder[]
  payments: Payment[]
  notes: CustomerNote[]
}

export async function getCustomerHistory(customerId: string) {
  const [sales, orders, notes] = await Promise.all([
    unwrap<Sale[]>(
      supabase
        .from('sales')
        .select('*, sale_items(*, products(name)), payments(*)')
        .eq('customer_id', customerId)
        .order('sold_at', { ascending: false })
        .limit(100),
    ),
    unwrap<RepairOrder[]>(
      supabase
        .from('repair_orders')
        .select('*, repair_garments(*, repair_garment_services(*))')
        .eq('customer_id', customerId)
        .order('received_at', { ascending: false })
        .limit(100),
    ),
    listCustomerNotes(customerId),
  ])

  const orderIds = orders.map((order) => order.id)
  let payments: Payment[] = []
  if (orderIds.length > 0) {
    payments = await unwrap<Payment[]>(
      supabase
        .from('payments')
        .select('*')
        .in('repair_order_id', orderIds)
        .order('paid_at', { ascending: false }),
    )
  }

  return { sales, orders, payments, notes } satisfies CustomerHistory
}
