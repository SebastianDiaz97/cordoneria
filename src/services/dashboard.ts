import { supabase, unwrap } from '@/lib/supabase'
import type {
  CashMovement,
  CashRegister,
  DailyCashRow,
  LowStockRow,
  Payment,
  PendingRow,
  PickupRow,
  ProductProfitRow,
} from '@/types'

export interface SalesRowForStats {
  id: string
  total: number
  status: string
  sold_at: string
  customer_id: string | null
  customers?: { full_name: string } | null
}

export interface SaleItemRowForStats {
  sale_id: string
  quantity: number
  line_total: number
  unit_cost: number
  product_id: string
  products?: { name: string } | null
  sales?: { sold_at: string; status: string }
}

export interface GarmentRowForStats {
  id: string
  status: string
  estimated_ready_at: string | null
  received_at: string
  service_price: number
}

export interface DashboardData {
  sales: SalesRowForStats[]
  saleItems: SaleItemRowForStats[]
  payments: Payment[]
  garments: GarmentRowForStats[]
  lowStock: LowStockRow[]
  pickup: PickupRow[]
  pending: PendingRow[]
  register: CashRegister | null
  movements: CashMovement[]
  dailyCash: DailyCashRow[]
  profitByProduct: ProductProfitRow[]
}

export async function getDashboardData(from: string, to: string) {
  const [
    sales,
    saleItems,
    payments,
    garments,
    lowStock,
    pickup,
    pending,
    registers,
    movements,
    dailyCash,
    profitByProduct,
  ] = await Promise.all([
    unwrap<SalesRowForStats[]>(
      supabase
        .from('sales')
        .select('id, total, status, sold_at, customer_id, customers(full_name)')
        .gte('sold_at', from)
        .lte('sold_at', to)
        .order('sold_at'),
    ),
    unwrap<SaleItemRowForStats[]>(
      supabase
        .from('sale_items')
        .select('sale_id, quantity, line_total, unit_cost, product_id, products(name), sales!inner(sold_at, status)')
        .gte('sales.sold_at', from)
        .lte('sales.sold_at', to),
    ),
    unwrap<Payment[]>(
      supabase
        .from('payments')
        .select('*')
        .gte('paid_at', from)
        .lte('paid_at', to),
    ),
    unwrap<GarmentRowForStats[]>(
      supabase
        .from('repair_garments')
        .select('id, status, estimated_ready_at, received_at, service_price'),
    ),
    unwrap<LowStockRow[]>(
      supabase.from('v_low_stock').select('*').order('missing', { ascending: false }),
    ),
    unwrap<PickupRow[]>(
      supabase.from('v_repair_pickup_list').select('*').order('ready_at'),
    ),
    unwrap<PendingRow[]>(
      supabase.from('v_repair_pending').select('*').order('received_at'),
    ),
    unwrap<CashRegister[]>(
      supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .limit(1),
    ),
    unwrap<CashMovement[]>(
      supabase
        .from('cash_movements')
        .select('*')
        .gte('moved_at', from)
        .lte('moved_at', to)
        .order('moved_at', { ascending: false }),
    ),
    unwrap<DailyCashRow[]>(
      supabase
        .from('v_daily_cash_summary')
        .select('*')
        .gte('day', from.slice(0, 10))
        .lte('day', to.slice(0, 10))
        .order('day'),
    ),
    unwrap<ProductProfitRow[]>(
      supabase
        .from('v_product_profit')
        .select('*')
        .order('profit', { ascending: false })
        .limit(10),
    ),
  ])

  return {
    sales,
    saleItems,
    payments,
    garments,
    lowStock,
    pickup,
    pending,
    register: registers[0] ?? null,
    movements,
    dailyCash,
    profitByProduct,
  } satisfies DashboardData
}

export async function listSalesForRange(from: string, to: string) {
  return unwrap<SalesRowForStats[]>(
    supabase
      .from('sales')
      .select('id, total, status, sold_at, customer_id, customers(full_name)')
      .gte('sold_at', from)
      .lte('sold_at', to)
      .order('sold_at', { ascending: false }),
  )
}
