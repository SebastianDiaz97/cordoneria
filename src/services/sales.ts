import { supabase, unwrap } from '@/lib/supabase'
import type {
  PaymentInput,
  Sale,
  SaleLineInput,
} from '@/types'

export async function createSale(input: {
  items: SaleLineInput[]
  payments: PaymentInput[]
  customerId?: string | null
  discountAmount?: number
  notes?: string | null
}) {
  return unwrap<string>(
    supabase.rpc('create_sale', {
      p_items: input.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price ?? null,
        discount_amount: item.discount_amount ?? 0,
      })),
      p_payments: input.payments.map((payment) => ({
        amount: payment.amount,
        payment_method: payment.payment_method,
        reference_number: payment.reference_number ?? null,
      })),
      p_customer_id: input.customerId ?? null,
      p_discount_amount: input.discountAmount ?? 0,
      p_notes: input.notes ?? null,
    }),
  )
}

export async function listSales(options: {
  from?: string
  to?: string
  status?: string
  limit?: number
} = {}) {
  let query = supabase
    .from('sales')
    .select('*, customers(full_name), payments(*)')
    .order('sold_at', { ascending: false })
    .limit(options.limit ?? 200)

  if (options.from) query = query.gte('sold_at', options.from)
  if (options.to) query = query.lte('sold_at', options.to)
  if (options.status) query = query.eq('status', options.status)

  return unwrap<Sale[]>(query)
}

export async function getSale(id: string) {
  return unwrap<Sale>(
    supabase
      .from('sales')
      .select('*, customers(*), sale_items(*, products(name, sku, unit)), payments(*)')
      .eq('id', id)
      .single(),
  )
}

export async function cancelSale(
  saleId: string,
  reason: string,
  refundMethod?: string | null,
) {
  return unwrap<null>(
    supabase.rpc('cancel_sale', {
      p_sale_id: saleId,
      p_reason: reason,
      p_refund_method: refundMethod ?? null,
    }),
  )
}
