import { supabase, unwrap } from '@/lib/supabase'
import type {
  InventoryMovement,
  Product,
  Purchase,
  PurchaseItem,
} from '@/types'

export async function listMovements(options: {
  productId?: string
  from?: string
  to?: string
  limit?: number
} = {}) {
  let query = supabase
    .from('inventory_movements')
    .select('*, products(name, unit)')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 200)

  if (options.productId) query = query.eq('product_id', options.productId)
  if (options.from) query = query.gte('created_at', options.from)
  if (options.to) query = query.lte('created_at', options.to)

  return unwrap<InventoryMovement[]>(query)
}

export async function adjustStock(
  productId: string,
  quantityDelta: number,
  reason: string,
) {
  return unwrap<null>(
    supabase.rpc('adjust_stock', {
      p_product_id: productId,
      p_quantity_delta: quantityDelta,
      p_reason: reason,
    }),
  )
}

export interface PurchaseLineInput {
  product_id: string
  quantity: number
  unit_cost: number
  discount_amount?: number
}

export async function receivePurchase(input: {
  items: PurchaseLineInput[]
  supplierId?: string | null
  invoiceReference?: string | null
  discountAmount?: number
  notes?: string | null
  purchasedAt?: string | null
}) {
  return unwrap<string>(
    supabase.rpc('receive_purchase', {
      p_items: input.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        discount_amount: item.discount_amount ?? 0,
      })),
      p_supplier_id: input.supplierId ?? null,
      p_invoice_reference: input.invoiceReference ?? null,
      p_discount_amount: input.discountAmount ?? 0,
      p_notes: input.notes ?? null,
      p_purchased_at: input.purchasedAt ?? null,
    }),
  )
}

export async function listPurchases(options: { from?: string; to?: string } = {}) {
  let query = supabase
    .from('purchases')
    .select('*, suppliers(name), purchase_items(*, products(name, unit))')
    .order('purchased_at', { ascending: false })
    .limit(200)

  if (options.from) query = query.gte('purchased_at', options.from)
  if (options.to) query = query.lte('purchased_at', options.to)

  return unwrap<Purchase[]>(query)
}

export async function listProductsForSelect() {
  return unwrap<Pick<Product, 'id' | 'name' | 'sku' | 'unit' | 'cost_price' | 'sale_price' | 'current_stock' | 'is_active'>[]>(
    supabase
      .from('products')
      .select('id, name, sku, unit, cost_price, sale_price, current_stock, is_active')
      .order('name'),
  )
}

export type PurchaseItemWithProduct = PurchaseItem & {
  products?: Pick<Product, 'name' | 'unit'> | null
}
