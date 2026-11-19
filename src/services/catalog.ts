import { supabase, unwrap } from '@/lib/supabase'
import type {
  BusinessSettings,
  Category,
  Product,
  ServiceCatalogItem,
  Supplier,
} from '@/types'

export interface ProductFilters {
  search?: string
  categoryId?: string
  supplierId?: string
  lowStock?: boolean
  includeInactive?: boolean
}

export async function listProducts(filters: ProductFilters = {}) {
  let query = supabase
    .from('products')
    .select('*, categories(name), suppliers(name)')
    .order('name')

  if (!filters.includeInactive) query = query.eq('is_active', true)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.supplierId)
    query = query.eq('default_supplier_id', filters.supplierId)
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`
    query = query.or(`name.ilike.${term},sku.ilike.${term},barcode.ilike.${term}`)
  }

  const products = await unwrap<Product[]>(query)
  if (filters.lowStock) {
    return products.filter(
      (product) =>
        product.current_stock <= product.minimum_stock ||
        product.current_stock < 0,
    )
  }
  return products
}

export async function searchSellableProducts(term: string) {
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .limit(20)

  const clean = term.trim()
  if (clean) {
    const like = `%${clean}%`
    query = query.or(`name.ilike.${like},sku.ilike.${like},barcode.ilike.${like}`)
  }
  return unwrap<Product[]>(query)
}

export interface ProductInput {
  name: string
  sku?: string | null
  barcode?: string | null
  description?: string | null
  category_id?: string | null
  default_supplier_id?: string | null
  unit: string
  cost_price: number
  sale_price: number
  minimum_stock: number
  is_active: boolean
}

export async function createProduct(input: ProductInput) {
  return unwrap<Product>(
    supabase.from('products').insert(input).select('*').single(),
  )
}

export async function updateProduct(id: string, input: ProductInput) {
  return unwrap<Product>(
    supabase.from('products').update(input).eq('id', id).select('*').single(),
  )
}

export async function setProductActive(id: string, isActive: boolean) {
  return unwrap<Product[]>(
    supabase
      .from('products')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('*'),
  )
}

export async function listCategories(includeInactive = false) {
  let query = supabase.from('categories').select('*').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  return unwrap<Category[]>(query)
}

export async function createCategory(input: {
  name: string
  description?: string | null
}) {
  return unwrap<Category>(
    supabase.from('categories').insert(input).select('*').single(),
  )
}

export async function updateCategory(
  id: string,
  input: { name: string; description?: string | null; is_active: boolean },
) {
  return unwrap<Category>(
    supabase.from('categories').update(input).eq('id', id).select('*').single(),
  )
}

export async function listSuppliers(includeInactive = false) {
  let query = supabase.from('suppliers').select('*').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  return unwrap<Supplier[]>(query)
}

export interface SupplierInput {
  name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  is_active: boolean
}

export async function createSupplier(input: SupplierInput) {
  return unwrap<Supplier>(
    supabase.from('suppliers').insert(input).select('*').single(),
  )
}

export async function updateSupplier(id: string, input: SupplierInput) {
  return unwrap<Supplier>(
    supabase.from('suppliers').update(input).eq('id', id).select('*').single(),
  )
}

export async function listServiceCatalog(includeInactive = false) {
  let query = supabase.from('service_catalog').select('*').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  return unwrap<ServiceCatalogItem[]>(query)
}

export async function getBusinessSettings() {
  return unwrap<BusinessSettings>(
    supabase.from('business_settings').select('*').eq('id', 1).single(),
  )
}

export interface BusinessSettingsInput {
  business_name: string
  currency_code: string
  timezone: string
  storage_grace_days: number
  storage_fee_mode: 'none' | 'per_day' | 'fixed'
  storage_fee_amount: number
  allow_negative_stock: boolean
}

export async function updateBusinessSettings(input: BusinessSettingsInput) {
  return unwrap<BusinessSettings>(
    supabase
      .from('business_settings')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('*')
      .single(),
  )
}
