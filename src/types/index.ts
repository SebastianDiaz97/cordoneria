export type Role = 'admin' | 'employee'

export type PaymentMethod =
  | 'cash'
  | 'debit_card'
  | 'credit_card'
  | 'bank_transfer'
  | 'other'

export type GarmentStatus =
  | 'received'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export type OrderStatus = 'open' | 'completed' | 'cancelled'

export type ProductUnit =
  | 'unidad'
  | 'metro'
  | 'cm'
  | 'rollo'
  | 'par'
  | 'caja'
  | 'paquete'
  | 'docena'
  | 'kg'
  | 'g'
  | 'litro'

export const PRODUCT_UNITS: ProductUnit[] = [
  'unidad',
  'metro',
  'cm',
  'rollo',
  'par',
  'caja',
  'paquete',
  'docena',
  'kg',
  'g',
  'litro',
]

export const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'debit_card',
  'credit_card',
  'bank_transfer',
  'other',
]

export interface Profile {
  id: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BusinessSettings {
  id: number
  business_name: string
  currency_code: string
  timezone: string
  storage_grace_days: number
  storage_fee_mode: 'none' | 'per_day' | 'fixed'
  storage_fee_amount: number
  allow_negative_stock: boolean
  updated_at: string
  updated_by: string | null
}

export interface Category {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Supplier {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  sku: string | null
  barcode: string | null
  name: string
  description: string | null
  category_id: string | null
  default_supplier_id: string | null
  unit: ProductUnit
  cost_price: number
  sale_price: number
  current_stock: number
  minimum_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
  categories?: Pick<Category, 'name'> | null
  suppliers?: Pick<Supplier, 'name'> | null
}

export interface Customer {
  id: string
  full_name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  notes: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CustomerNote {
  id: string
  customer_id: string
  note: string
  created_by: string | null
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  discount_amount: number
  unit_cost: number
  line_total: number
  created_at: string
  products?: Pick<Product, 'name' | 'sku' | 'unit'> | null
}

export interface Payment {
  id: string
  sale_id: string | null
  repair_order_id: string | null
  garment_id: string | null
  payment_type:
    | 'sale_payment'
    | 'repair_deposit'
    | 'repair_payment'
    | 'refund'
  amount: number
  payment_method: PaymentMethod
  paid_at: string
  reference_number: string | null
  notes: string | null
  received_by: string | null
  cash_register_id: string | null
  created_at: string
}

export interface Sale {
  id: string
  sale_number: number
  customer_id: string | null
  status: 'draft' | 'completed' | 'cancelled'
  sold_at: string
  subtotal: number
  discount_amount: number
  total: number
  notes: string | null
  created_by: string | null
  created_at: string
  customers?: Pick<Customer, 'full_name'> | null
  sale_items?: SaleItem[]
  payments?: Payment[]
}

export interface RepairOrder {
  id: string
  order_number: number
  customer_id: string
  status: OrderStatus
  received_at: string
  notes: string | null
  subtotal: number
  discount_amount: number
  total: number
  created_by: string | null
  created_at: string
  updated_at: string
  customers?: Customer | null
  repair_garments?: RepairGarment[]
}

export interface GarmentService {
  id: string
  garment_id: string
  service_id: string | null
  description: string
  quantity: number
  unit_price: number
  line_total: number
  created_at: string
}

export interface RepairGarment {
  id: string
  repair_order_id: string
  garment_number: number
  garment_type: string
  color: string | null
  description: string | null
  condition_on_receipt: string | null
  requested_work: string
  internal_notes: string | null
  status: GarmentStatus
  received_at: string
  estimated_ready_at: string | null
  ready_at: string | null
  delivered_at: string | null
  service_price: number
  storage_grace_days: number
  storage_fee_mode: 'none' | 'per_day' | 'fixed'
  storage_fee_amount: number
  storage_fee_charged: number | null
  storage_terms_accepted: boolean
  storage_terms_accepted_at: string | null
  created_at: string
  updated_at: string
  repair_garment_services?: GarmentService[]
  repair_materials?: RepairMaterial[]
  payments?: Payment[]
  repair_status_history?: StatusHistoryEntry[]
  repair_notifications?: NotificationEntry[]
  garment_photos?: GarmentPhoto[]
  repair_orders?: { order_number: number; customer_id: string } | null
}

export interface RepairMaterial {
  id: string
  garment_id: string
  product_id: string
  quantity: number
  unit_cost: number
  notes: string | null
  used_at: string
  voided_at: string | null
  void_reason: string | null
  created_by: string | null
  created_at: string
  products?: Pick<Product, 'name' | 'unit'> | null
}

export interface StatusHistoryEntry {
  id: string
  garment_id: string
  previous_status: string | null
  new_status: string
  changed_by: string | null
  notes: string | null
  changed_at: string
}

export interface NotificationEntry {
  id: string
  garment_id: string
  method: 'whatsapp' | 'phone_call' | 'in_person' | 'other'
  notified_at: string
  result: string
  notes: string | null
  notified_by: string | null
}

export interface GarmentPhoto {
  id: string
  garment_id: string
  storage_path: string
  caption: string | null
  uploaded_by: string | null
  created_at: string
}

export interface ServiceCatalogItem {
  id: string
  name: string
  description: string | null
  default_price: number
  estimated_minutes: number | null
  is_active: boolean
}

export interface InventoryMovement {
  id: string
  product_id: string
  movement_type: string
  quantity_delta: number
  unit_cost: number | null
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  products?: Pick<Product, 'name' | 'unit'> | null
}

export interface Purchase {
  id: string
  purchase_number: number
  supplier_id: string | null
  status: 'draft' | 'received' | 'cancelled'
  purchased_at: string
  subtotal: number
  discount_amount: number
  total: number
  invoice_reference: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  suppliers?: Pick<Supplier, 'name'> | null
  purchase_items?: PurchaseItem[]
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string
  quantity: number
  unit_cost: number
  discount_amount: number
  line_total: number
  products?: Pick<Product, 'name' | 'unit'> | null
}

export interface CashRegister {
  id: string
  opened_by: string | null
  closed_by: string | null
  opened_at: string
  closed_at: string | null
  opening_amount: number
  closing_amount: number | null
  status: 'open' | 'closed'
  notes: string | null
  created_at: string
}

export interface CashMovement {
  id: string
  cash_register_id: string | null
  movement_type: 'expense' | 'withdrawal' | 'deposit' | 'other_income'
  amount: number
  payment_method: PaymentMethod
  description: string
  reference_type: string | null
  reference_id: string | null
  moved_at: string
  created_by: string | null
  created_at: string
}

export interface LowStockRow {
  id: string
  sku: string | null
  name: string
  unit: string
  current_stock: number
  minimum_stock: number
  missing: number
}

export interface PickupRow {
  garment_id: string
  order_number: number
  garment_number: number
  customer_id: string
  customer_name: string
  phone: string | null
  whatsapp: string | null
  garment_type: string
  color: string | null
  requested_work: string
  ready_at: string
  days_since_ready: number
  storage_grace_days: number
  free_pickup_until: string
  days_over_grace: number
  storage_fee_due: number
  service_price: number
  paid: number
  balance_due: number
  last_notified_at: string | null
  notifications_count: number
}

export interface PendingRow {
  garment_id: string
  order_number: number
  garment_number: number
  customer_name: string
  phone: string | null
  garment_type: string
  color: string | null
  requested_work: string
  status: GarmentStatus
  received_at: string
  estimated_ready_at: string | null
  is_late: boolean
}

export interface DailyCashRow {
  day: string
  origin: 'sale' | 'repair' | 'cash_movement'
  payment_method: PaymentMethod
  received: number
  refunded: number
  net: number
}

export interface ProductProfitRow {
  product_id: string
  name: string
  quantity_sold: number
  revenue: number
  cost: number
  profit: number
}

export interface CloseRegisterResult {
  cash_register_id: string
  opening_amount: number
  expected_cash: number
  counted_cash: number
  difference: number
  payments_by_method: Record<string, number>
}

export interface DeliverResult {
  garment_id: string
  service_price: number
  storage_fee: number
  previously_paid: number
  collected_now: number
}

export interface SaleLineInput {
  product_id: string
  quantity: number
  unit_price?: number
  discount_amount?: number
}

export interface PaymentInput {
  amount: number
  payment_method: PaymentMethod
  reference_number?: string | null
}

export interface GarmentInput {
  garment_type: string
  color?: string | null
  description?: string | null
  condition_on_receipt?: string | null
  requested_work: string
  internal_notes?: string | null
  estimated_ready_at?: string | null
  storage_terms_accepted?: boolean
  services: {
    service_id?: string | null
    description?: string | null
    quantity?: number
    unit_price?: number
  }[]
}
