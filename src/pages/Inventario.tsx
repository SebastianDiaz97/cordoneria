import { useMemo, useState } from 'react'
import {
  ArrowDownUp,
  Eye,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { useAsync } from '@/hooks/useAsync'
import {
  listCategories,
  listProducts,
  listSuppliers,
  setProductActive,
} from '@/services/catalog'
import {
  adjustStock,
  listMovements,
  listPurchases,
} from '@/services/inventory'
import type { Product, Purchase } from '@/types'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  MOVEMENT_TYPE_LABELS,
} from '@/lib/format'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/States'
import { ProductFormModal } from '@/features/inventory/ProductFormModal'
import { PurchaseFormModal } from '@/features/inventory/PurchaseFormModal'
import { CatalogModal } from '@/features/inventory/CatalogModal'
import { cn } from '@/lib/utils'

type Tab = 'products' | 'purchases' | 'movements'

export default function Inventario() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('products')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)

  const [productModal, setProductModal] = useState<{
    open: boolean
    product: Product | null
  }>({ open: false, product: null })
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null)
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [movementProduct, setMovementProduct] = useState('')
  const [purchaseDetail, setPurchaseDetail] = useState<Purchase | null>(null)

  const categoriesQuery = useAsync(() => listCategories(true), [catalogOpen])
  const suppliersQuery = useAsync(() => listSuppliers(true), [catalogOpen])
  const productsQuery = useAsync(
    () =>
      listProducts({
        search,
        categoryId: categoryId || undefined,
        supplierId: supplierId || undefined,
        lowStock,
        includeInactive,
      }),
    [search, categoryId, supplierId, lowStock, includeInactive],
  )
  const movementsQuery = useAsync(
    () => listMovements({ productId: movementProduct || undefined }),
    [movementProduct],
  )
  const purchasesQuery = useAsync(() => listPurchases(), [])
  const allProductsQuery = useAsync(() => listProducts(), [])

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const allProducts = useMemo(
    () => allProductsQuery.data ?? [],
    [allProductsQuery.data],
  )
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const suppliers = useMemo(
    () => suppliersQuery.data ?? [],
    [suppliersQuery.data],
  )

  function reloadAll() {
    productsQuery.reload()
    categoriesQuery.reload()
    suppliersQuery.reload()
  }

  async function toggleActive(product: Product) {
    try {
      await setProductActive(product.id, !product.is_active)
      toast.success(product.is_active ? 'Producto desactivado' : 'Producto activado')
      productsQuery.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
    }
  }

  async function saveAdjustment() {
    if (!adjustTarget) return
    const delta = Number(adjustDelta)
    if (!delta || Number.isNaN(delta)) {
      toast.error('Ingresa una cantidad distinta de 0')
      return
    }
    if (!adjustReason.trim()) {
      toast.error('El motivo es obligatorio')
      return
    }
    setAdjusting(true)
    try {
      await adjustStock(adjustTarget.id, delta, adjustReason.trim())
      toast.success('Stock ajustado')
      setAdjustTarget(null)
      setAdjustDelta('')
      setAdjustReason('')
      productsQuery.reload()
      movementsQuery.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo ajustar')
    } finally {
      setAdjusting(false)
    }
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'products', label: 'Productos' },
    { value: 'purchases', label: 'Compras' },
    { value: 'movements', label: 'Movimientos' },
  ]

  return (
    <div>
      <PageHeader
        title='Inventario'
        description='Productos, stock, compras y trazabilidad de movimientos'
        actions={
          <>
            <Button variant='outline' onClick={() => setCatalogOpen(true)}>
              <Settings2 className='h-4 w-4' /> Categorías / proveedores
            </Button>
            <Button variant='outline' onClick={() => setPurchaseOpen(true)}>
              <PackagePlus className='h-4 w-4' /> Registrar compra
            </Button>
            <Button
              onClick={() => setProductModal({ open: true, product: null })}
            >
              <Plus className='h-4 w-4' /> Nuevo producto
            </Button>
          </>
        }
      />

      <div className='mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1 sm:w-fit'>
        {tabs.map((item) => (
          <button
            key={item.value}
            type='button'
            onClick={() => setTab(item.value)}
            className={cn(
              'flex-1 rounded-md px-4 py-1.5 text-sm font-medium sm:flex-none',
              tab === item.value
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-end gap-2'>
            <Field label='Buscar' className='min-w-52 flex-1'>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary' />
                <Input
                  className='pl-9'
                  placeholder='Nombre, SKU o código de barras'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </Field>
            <Field label='Categoría' className='w-44'>
              <Select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value=''>Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label='Proveedor' className='w-44'>
              <Select
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
              >
                <option value=''>Todos</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </Field>
            <label className='flex h-10 items-center gap-2 text-sm'>
              <input
                type='checkbox'
                className='h-4 w-4 accent-primary'
                checked={lowStock}
                onChange={(event) => setLowStock(event.target.checked)}
              />
              Solo stock bajo
            </label>
            <label className='flex h-10 items-center gap-2 text-sm'>
              <input
                type='checkbox'
                className='h-4 w-4 accent-primary'
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
              />
              Incluir inactivos
            </label>
          </div>

          {productsQuery.loading ? <LoadingBlock /> : null}
          {productsQuery.error ? (
            <ErrorBlock message={productsQuery.error} onRetry={productsQuery.reload} />
          ) : null}

          {!productsQuery.loading && !productsQuery.error ? (
            products.length === 0 ? (
              <EmptyState
                title='Sin productos'
                description='Crea tu primer producto o ajusta los filtros.'
                action={
                  <Button
                    size='sm'
                    onClick={() => setProductModal({ open: true, product: null })}
                  >
                    Nuevo producto
                  </Button>
                }
              />
            ) : (
              <div className='rounded-xl border border-border bg-surface shadow-soft'>
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Producto</Th>
                      <Th>Categoría</Th>
                      <Th>Stock</Th>
                      <Th>Mínimo</Th>
                      <Th>Costo</Th>
                      <Th>Precio</Th>
                      <Th>Unidad</Th>
                      <Th className='text-right'>Acciones</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const low = product.current_stock <= product.minimum_stock
                      return (
                        <tr key={product.id} className='hover:bg-muted/40'>
                          <Td>
                            <p className='font-medium'>
                              {product.name}
                              {!product.is_active ? (
                                <Badge tone='danger' className='ml-2'>
                                  Inactivo
                                </Badge>
                              ) : null}
                            </p>
                            <p className='text-xs text-text-secondary'>
                              {product.sku ? `SKU ${product.sku}` : 'Sin SKU'}
                              {product.barcode ? ` · ${product.barcode}` : ''}
                            </p>
                          </Td>
                          <Td>{product.categories?.name ?? '—'}</Td>
                          <Td>
                            <span
                              className={cn(
                                'font-medium',
                                low && 'text-danger',
                              )}
                            >
                              {formatNumber(product.current_stock, 2)}
                            </span>
                          </Td>
                          <Td>{formatNumber(product.minimum_stock, 2)}</Td>
                          <Td>{formatCurrency(product.cost_price)}</Td>
                          <Td>{formatCurrency(product.sale_price)}</Td>
                          <Td>{product.unit}</Td>
                          <Td>
                            <div className='flex justify-end gap-1'>
                              <Button
                                variant='ghost'
                                size='icon'
                                title='Editar'
                                onClick={() =>
                                  setProductModal({ open: true, product })
                                }
                              >
                                <Pencil className='h-4 w-4' />
                              </Button>
                              {isAdmin ? (
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  title='Ajustar stock'
                                  onClick={() => {
                                    setAdjustTarget(product)
                                    setAdjustDelta('')
                                    setAdjustReason('')
                                  }}
                                >
                                  <ArrowDownUp className='h-4 w-4' />
                                </Button>
                              ) : null}
                              <Button
                                variant='ghost'
                                size='icon'
                                title='Ver movimientos'
                                onClick={() => {
                                  setMovementProduct(product.id)
                                  setTab('movements')
                                }}
                              >
                                <Eye className='h-4 w-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => toggleActive(product)}
                              >
                                {product.is_active ? 'Desactivar' : 'Activar'}
                              </Button>
                            </div>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </TableWrap>
              </div>
            )
          ) : null}
        </div>
      ) : null}

      {tab === 'purchases' ? (
        <div className='flex flex-col gap-3'>
          <div className='flex justify-end'>
            <Button size='sm' variant='outline' onClick={() => setPurchaseOpen(true)}>
              <Plus className='h-3.5 w-3.5' /> Nueva compra
            </Button>
          </div>
          {purchasesQuery.loading ? <LoadingBlock /> : null}
          {purchasesQuery.error ? (
            <ErrorBlock message={purchasesQuery.error} onRetry={purchasesQuery.reload} />
          ) : null}
          {!purchasesQuery.loading && (purchasesQuery.data ?? []).length === 0 ? (
            <EmptyState
              title='Sin compras registradas'
              description='Registra una compra para aumentar stock y actualizar costos.'
            />
          ) : null}
          {(purchasesQuery.data ?? []).length > 0 ? (
            <div className='rounded-xl border border-border bg-surface shadow-soft'>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>N°</Th>
                    <Th>Fecha</Th>
                    <Th>Proveedor</Th>
                    <Th>Factura</Th>
                    <Th>Ítems</Th>
                    <Th>Total</Th>
                    <Th className='text-right'>Detalle</Th>
                  </tr>
                </thead>
                <tbody>
                  {(purchasesQuery.data ?? []).map((purchase) => (
                    <tr key={purchase.id} className='hover:bg-muted/40'>
                      <Td className='font-medium'>#{purchase.purchase_number}</Td>
                      <Td>{formatDateTime(purchase.purchased_at)}</Td>
                      <Td>{purchase.suppliers?.name ?? 'Sin proveedor'}</Td>
                      <Td>{purchase.invoice_reference ?? '—'}</Td>
                      <Td>{(purchase.purchase_items ?? []).length}</Td>
                      <Td className='font-medium'>{formatCurrency(purchase.total)}</Td>
                      <Td>
                        <div className='flex justify-end'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setPurchaseDetail(purchase)}
                          >
                            <Eye className='h-4 w-4' />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'movements' ? (
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-end gap-2'>
            <Field label='Producto' className='w-64'>
              <Select
                value={movementProduct}
                onChange={(event) => setMovementProduct(event.target.value)}
              >
                <option value=''>Todos los productos</option>
                {allProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {movementsQuery.loading ? <LoadingBlock /> : null}
          {movementsQuery.error ? (
            <ErrorBlock message={movementsQuery.error} onRetry={movementsQuery.reload} />
          ) : null}
          {!movementsQuery.loading && (movementsQuery.data ?? []).length === 0 ? (
            <EmptyState title='Sin movimientos' description='Aún no hay entradas ni salidas de stock.' />
          ) : null}
          {(movementsQuery.data ?? []).length > 0 ? (
            <div className='rounded-xl border border-border bg-surface shadow-soft'>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Producto</Th>
                    <Th>Tipo</Th>
                    <Th>Cantidad</Th>
                    <Th>Costo</Th>
                    <Th>Notas</Th>
                  </tr>
                </thead>
                <tbody>
                  {(movementsQuery.data ?? []).map((movement) => (
                    <tr key={movement.id}>
                      <Td>{formatDateTime(movement.created_at)}</Td>
                      <Td>{movement.products?.name ?? 'Producto'}</Td>
                      <Td>
                        {MOVEMENT_TYPE_LABELS[movement.movement_type] ??
                          movement.movement_type}
                      </Td>
                      <Td>
                        <span
                          className={cn(
                            'font-medium',
                            Number(movement.quantity_delta) < 0
                              ? 'text-danger'
                              : 'text-success',
                          )}
                        >
                          {Number(movement.quantity_delta) > 0 ? '+' : ''}
                          {formatNumber(movement.quantity_delta, 3)}
                        </span>
                      </Td>
                      <Td>
                        {movement.unit_cost != null
                          ? formatCurrency(movement.unit_cost)
                          : '—'}
                      </Td>
                      <Td className='max-w-64 truncate'>{movement.notes ?? '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          ) : null}
        </div>
      ) : null}

      {productModal.open ? (
      <ProductFormModal
        open
        product={productModal.product}
        categories={categories.filter((category) => category.is_active)}
        suppliers={suppliers.filter((supplier) => supplier.is_active)}
        onClose={() => setProductModal({ open: false, product: null })}
        onSaved={() => productsQuery.reload()}
      />
      ) : null}

      {purchaseOpen ? (
      <PurchaseFormModal
        open
        products={allProducts}
        suppliers={suppliers.filter((supplier) => supplier.is_active)}
        onClose={() => setPurchaseOpen(false)}
        onSaved={() => {
          productsQuery.reload()
          allProductsQuery.reload()
          purchasesQuery.reload()
          movementsQuery.reload()
        }}
      />
      ) : null}

      {catalogOpen ? (
        <CatalogModal
          open
          onClose={() => setCatalogOpen(false)}
          onChanged={reloadAll}
        />
      ) : null}

      <Modal
        open={adjustTarget !== null}
        onClose={() => setAdjustTarget(null)}
        title='Ajuste de stock'
        description='Usa cantidad positiva para ingresar y negativa para descontar.'
        footer={
          <>
            <Button variant='outline' onClick={() => setAdjustTarget(null)}>
              Cancelar
            </Button>
            <Button loading={adjusting} onClick={saveAdjustment}>
              Aplicar ajuste
            </Button>
          </>
        }
      >
        {adjustTarget ? (
          <div className='flex flex-col gap-3'>
            <p className='text-sm'>
              <span className='text-text-secondary'>Producto: </span>
              {adjustTarget.name}
            </p>
            <p className='text-sm'>
              <span className='text-text-secondary'>Stock actual: </span>
              {formatNumber(adjustTarget.current_stock, 3)} {adjustTarget.unit}
            </p>
            <Field label='Cantidad (+/-)'>
              <Input
                type='number'
                step='any'
                value={adjustDelta}
                onChange={(event) => setAdjustDelta(event.target.value)}
                placeholder='Ej: 10 o -2.5'
              />
            </Field>
            <Field label='Motivo' hint='Obligatorio'>
              <Textarea
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
                placeholder='Carga inicial, merma, corrección…'
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={purchaseDetail !== null}
        onClose={() => setPurchaseDetail(null)}
        title={
          purchaseDetail
            ? `Compra #${purchaseDetail.purchase_number}`
            : 'Detalle de compra'
        }
        size='lg'
        footer={
          <Button variant='outline' onClick={() => setPurchaseDetail(null)}>
            Cerrar
          </Button>
        }
      >
        {purchaseDetail ? (
          <div className='flex flex-col gap-3 text-sm'>
            <div className='grid gap-2 sm:grid-cols-2'>
              <p>
                <span className='text-text-secondary'>Fecha: </span>
                {formatDateTime(purchaseDetail.purchased_at)}
              </p>
              <p>
                <span className='text-text-secondary'>Proveedor: </span>
                {purchaseDetail.suppliers?.name ?? 'Sin proveedor'}
              </p>
              <p>
                <span className='text-text-secondary'>Factura: </span>
                {purchaseDetail.invoice_reference ?? '—'}
              </p>
              <p>
                <span className='text-text-secondary'>Notas: </span>
                {purchaseDetail.notes ?? '—'}
              </p>
            </div>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Producto</Th>
                  <Th>Cantidad</Th>
                  <Th>Costo</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody>
                {(purchaseDetail.purchase_items ?? []).map((item) => (
                  <tr key={item.id}>
                    <Td>{item.products?.name ?? 'Producto'}</Td>
                    <Td>{formatNumber(item.quantity, 3)}</Td>
                    <Td>{formatCurrency(item.unit_cost)}</Td>
                    <Td>{formatCurrency(item.line_total)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <div className='self-end rounded-lg bg-muted/50 p-3'>
              <p className='flex gap-6 justify-between'>
                <span>Subtotal</span>
                <span>{formatCurrency(purchaseDetail.subtotal)}</span>
              </p>
              <p className='flex gap-6 justify-between'>
                <span>Descuento</span>
                <span>{formatCurrency(purchaseDetail.discount_amount)}</span>
              </p>
              <p className='flex gap-6 justify-between border-t border-border pt-1 font-semibold'>
                <span>Total</span>
                <span>{formatCurrency(purchaseDetail.total)}</span>
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
