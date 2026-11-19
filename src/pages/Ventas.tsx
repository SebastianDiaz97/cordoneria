import { useMemo, useState } from 'react'
import { Plus, Minus, Trash2, Search, Receipt, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { useAsync } from '@/hooks/useAsync'
import { listProducts } from '@/services/catalog'
import { listCustomers } from '@/services/customers'
import { createSale, getSale } from '@/services/sales'
import type { PaymentMethod, Product, Sale } from '@/types'
import { PAYMENT_METHODS } from '@/types'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  PAYMENT_METHOD_LABELS,
} from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/Card'
import { EmptyState, LoadingBlock, TableWrap, Td, Th } from '@/components/ui/States'
import { SaleHistory } from '@/features/sales/SaleHistory'
import { cn } from '@/lib/utils'
import { appliedTenderAmounts, summarizeTender } from '@/lib/payments'

interface CartLine {
  productId: string
  name: string
  unit: string
  stock: number
  quantity: number
  unitPrice: number
  discount: number
}

interface PaymentRow {
  id: string
  method: PaymentMethod
  amount: number
  reference: string
}

export default function Ventas() {
  const [tab, setTab] = useState<'pos' | 'history'>('pos')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [customerId, setCustomerId] = useState('')
  const [notes, setNotes] = useState('')
  const [payments, setPayments] = useState<PaymentRow[]>([
    { id: crypto.randomUUID(), method: 'cash', amount: 0, reference: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState<Sale | null>(null)

  const productsQuery = useAsync(() => listProducts(), [])
  const customersQuery = useAsync(() => listCustomers(), [])

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products.slice(0, 30)
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          (product.sku ?? '').toLowerCase().includes(term) ||
          (product.barcode ?? '').toLowerCase().includes(term),
      )
      .slice(0, 30)
  }, [products, search])

  const subtotal = cart.reduce(
    (total, line) =>
      total + Math.max(line.quantity * line.unitPrice - line.discount, 0),
    0,
  )
  const total = Math.max(Math.round(subtotal - (globalDiscount || 0)), 0)
  const tenderSummary = summarizeTender(
    payments.map((payment) => ({
      method: payment.method,
      amount: payment.amount,
    })),
    total,
  )
  const appliedPayments = appliedTenderAmounts(
    payments.map((payment) => ({
      method: payment.method,
      amount: payment.amount,
      reference: payment.reference,
    })),
    total,
  )
  const canConfirm =
    cart.length > 0 &&
    total > 0 &&
    tenderSummary.valid &&
    appliedPayments.length > 0

  function addProduct(product: Product) {
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id)
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        )
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          stock: Number(product.current_stock),
          quantity: 1,
          unitPrice: Number(product.sale_price),
          discount: 0,
        },
      ]
    })
  }

  function updateLine(productId: string, patch: Partial<CartLine>) {
    setCart((current) =>
      current.map((line) =>
        line.productId === productId ? { ...line, ...patch } : line,
      ),
    )
  }

  function removeLine(productId: string) {
    setCart((current) => current.filter((line) => line.productId !== productId))
  }

  function updatePayment(id: string, patch: Partial<PaymentRow>) {
    setPayments((current) =>
      current.map((payment) =>
        payment.id === id ? { ...payment, ...patch } : payment,
      ),
    )
  }

  function fillRemaining(id: string) {
    const others = payments
      .filter((payment) => payment.id !== id)
      .reduce((sum, payment) => sum + payment.amount, 0)
    updatePayment(id, { amount: Math.max(total - others, 0) })
  }

  function resetSale() {
    setCart([])
    setGlobalDiscount(0)
    setCustomerId('')
    setNotes('')
    setPayments([
      { id: crypto.randomUUID(), method: 'cash', amount: 0, reference: '' },
    ])
    setSearch('')
  }

  async function confirmSale() {
    if (!canConfirm) {
      toast.error('Revisa el carrito y que los pagos coincidan con el total')
      return
    }
    setSaving(true)
    try {
      const saleId = await createSale({
        items: cart.map((line) => ({
          product_id: line.productId,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          discount_amount: line.discount,
        })),
        payments: appliedTenderAmounts(
          payments.map((payment) => ({
            method: payment.method,
            amount: payment.amount,
            reference: payment.reference,
          })),
          total,
        ).map((payment) => ({
          amount: payment.amount,
          payment_method: payment.method,
          reference_number: payment.reference || null,
        })),
        customerId: customerId || null,
        discountAmount: globalDiscount || 0,
        notes: notes || null,
      })
      const sale = await getSale(saleId)
      setReceipt(sale)
      toast.success(`Venta #${sale.sale_number} registrada`)
      resetSale()
      productsQuery.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title='Ventas'
        description='Punto de venta e historial de ventas'
        actions={
          <div className='flex rounded-lg border border-border bg-surface p-1'>
            <button
              type='button'
              onClick={() => setTab('pos')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                tab === 'pos' ? 'bg-primary text-white' : 'text-text-secondary',
              )}
            >
              Nueva venta
            </button>
            <button
              type='button'
              onClick={() => setTab('history')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                tab === 'history' ? 'bg-primary text-white' : 'text-text-secondary',
              )}
            >
              Historial
            </button>
          </div>
        }
      />

      {tab === 'history' ? (
        <SaleHistory />
      ) : (
        <div className='grid gap-4 lg:grid-cols-[1fr_1.15fr]'>
          <div className='rounded-xl border border-border bg-surface shadow-soft'>
            <div className='border-b border-border p-3'>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary' />
                <Input
                  className='pl-9'
                  placeholder='Buscar por nombre, SKU o código de barras'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className='max-h-[65vh] overflow-y-auto'>
              {productsQuery.loading ? <LoadingBlock /> : null}
              {productsQuery.error ? (
                <p className='p-4 text-sm text-danger'>{productsQuery.error}</p>
              ) : null}
              {!productsQuery.loading && filtered.length === 0 ? (
                <EmptyState title='Sin productos' description='No hay productos activos que coincidan.' />
              ) : (
                <ul className='divide-y divide-border'>
                  {filtered.map((product) => (
                    <li key={product.id}>
                      <button
                        type='button'
                        onClick={() => addProduct(product)}
                        className='flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/60'
                      >
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-medium'>{product.name}</p>
                          <p className='text-xs text-text-secondary'>
                            {product.sku ? `SKU ${product.sku} · ` : ''}
                            Stock {formatNumber(product.current_stock, 2)} {product.unit}
                          </p>
                        </div>
                        <div className='text-right'>
                          <p className='text-sm font-semibold'>
                            {formatCurrency(product.sale_price)}
                          </p>
                          <p className='text-xs text-text-secondary'>Agregar +</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className='flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-soft'>
            <div className='flex items-center justify-between'>
              <h2 className='flex items-center gap-2 text-sm font-semibold'>
                <ShoppingCart className='h-4 w-4' /> Carrito
              </h2>
              <span className='text-xs text-text-secondary'>
                {cart.length} línea(s)
              </span>
            </div>

            {cart.length === 0 ? (
              <EmptyState
                title='Carrito vacío'
                description='Selecciona productos del listado para comenzar la venta.'
              />
            ) : (
              <div className='max-h-64 overflow-y-auto'>
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Producto</Th>
                      <Th>Cant.</Th>
                      <Th>Precio</Th>
                      <Th>Desc.</Th>
                      <Th>Total</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((line) => (
                      <tr key={line.productId}>
                        <Td>
                          <span className='text-sm'>{line.name}</span>
                          {line.quantity > line.stock ? (
                            <span className='block text-[11px] text-danger'>
                              Supera stock ({formatNumber(line.stock, 2)})
                            </span>
                          ) : null}
                        </Td>
                        <Td>
                          <div className='flex items-center gap-1'>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7'
                              onClick={() =>
                                updateLine(line.productId, {
                                  quantity: Math.max(line.quantity - 1, 0.01),
                                })
                              }
                            >
                              <Minus className='h-3 w-3' />
                            </Button>
                            <Input
                              type='number'
                              min={0.01}
                              step='any'
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(line.productId, {
                                  quantity: Number(event.target.value) || 0,
                                })
                              }
                              className='h-8 w-16 px-1 text-center'
                            />
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7'
                              onClick={() =>
                                updateLine(line.productId, {
                                  quantity: line.quantity + 1,
                                })
                              }
                            >
                              <Plus className='h-3 w-3' />
                            </Button>
                          </div>
                        </Td>
                        <Td>
                          <Input
                            type='number'
                            min={0}
                            step={1}
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateLine(line.productId, {
                                unitPrice: Number(event.target.value) || 0,
                              })
                            }
                            className='h-8 w-24 px-2'
                          />
                        </Td>
                        <Td>
                          <Input
                            type='number'
                            min={0}
                            step={1}
                            value={line.discount}
                            onChange={(event) =>
                              updateLine(line.productId, {
                                discount: Number(event.target.value) || 0,
                              })
                            }
                            className='h-8 w-20 px-2'
                          />
                        </Td>
                        <Td className='whitespace-nowrap font-medium'>
                          {formatCurrency(
                            Math.max(line.quantity * line.unitPrice - line.discount, 0),
                          )}
                        </Td>
                        <Td>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => removeLine(line.productId)}
                            title='Quitar'
                          >
                            <Trash2 className='h-4 w-4 text-danger' />
                          </Button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              </div>
            )}

            <div className='grid gap-2 sm:grid-cols-2'>
              <Field label='Cliente (opcional)'>
                <Select
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                >
                  <option value=''>Sin cliente</option>
                  {(customersQuery.data ?? []).map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label='Descuento general'>
                <Input
                  type='number'
                  min={0}
                  step={1}
                  value={globalDiscount || ''}
                  placeholder='0'
                  onChange={(event) =>
                    setGlobalDiscount(Number(event.target.value) || 0)
                  }
                />
              </Field>
            </div>

            <Field label='Observaciones'>
              <Textarea
                className='min-h-14'
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder='Opcional'
              />
            </Field>

            <div className='rounded-lg bg-muted/50 p-3 text-sm'>
              <p className='flex justify-between'>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </p>
              <p className='flex justify-between'>
                <span>Descuento</span>
                <span>-{formatCurrency(globalDiscount || 0)}</span>
              </p>
              <p className='mt-1 flex justify-between border-t border-border pt-1 text-base font-semibold'>
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </p>
            </div>

            <div className='flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <p className='text-sm font-medium'>Pagos</p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setPayments((current) => [
                      ...current,
                      {
                        id: crypto.randomUUID(),
                        method: 'cash',
                        amount: 0,
                        reference: '',
                      },
                    ])
                  }
                >
                  <Plus className='h-3.5 w-3.5' /> Método
                </Button>
              </div>
              {payments.map((payment) => (
                <div key={payment.id} className='flex flex-wrap items-end gap-2'>
                  <Field label='Método' className='w-32'>
                    <Select
                      value={payment.method}
                      onChange={(event) =>
                        updatePayment(payment.id, {
                          method: event.target.value as PaymentMethod,
                        })
                      }
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {PAYMENT_METHOD_LABELS[method]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label='Monto' className='w-28'>
                    <Input
                      type='number'
                      min={0}
                      step={1}
                      value={payment.amount || ''}
                      onChange={(event) =>
                        updatePayment(payment.id, {
                          amount: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </Field>
                  <Field label='Referencia' className='min-w-28 flex-1'>
                    <Input
                      value={payment.reference}
                      onChange={(event) =>
                        updatePayment(payment.id, { reference: event.target.value })
                      }
                      placeholder='Opcional'
                    />
                  </Field>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => fillRemaining(payment.id)}
                  >
                    Restante
                  </Button>
                  {payments.length > 1 ? (
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() =>
                        setPayments((current) =>
                          current.filter((row) => row.id !== payment.id),
                        )
                      }
                    >
                      <Trash2 className='h-4 w-4 text-danger' />
                    </Button>
                  ) : null}
                </div>
              ))}
              <p
                className={cn(
                  'text-xs',
                  tenderSummary.valid ? 'text-success' : 'text-danger',
                )}
              >
                Recibido {formatCurrency(tenderSummary.tendered)} ·{' '}
                {tenderSummary.missing > 0
                  ? `Falta ${formatCurrency(tenderSummary.missing)}`
                  : tenderSummary.nonCashExcess > 0
                    ? 'Los otros métodos superan el total'
                    : tenderSummary.change > 0
                      ? `Vuelto ${formatCurrency(tenderSummary.change)}`
                      : 'Pago exacto'}
              </p>
            </div>

            <Button
              className='mt-1 w-full'
              loading={saving}
              disabled={!canConfirm}
              onClick={confirmSale}
            >
              <Receipt className='h-4 w-4' /> Confirmar venta
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        title={receipt ? `Venta #${receipt.sale_number}` : 'Comprobante'}
        description='Comprobante interno de venta'
        size='md'
        footer={
          <>
            <Button variant='outline' onClick={() => setReceipt(null)}>
              Cerrar
            </Button>
          </>
        }
      >
        {receipt ? (
          <div className='flex flex-col gap-3 text-sm'>
            <p className='text-text-secondary'>
              {formatDateTime(receipt.sold_at)} ·{' '}
              {receipt.customers?.full_name ?? 'Sin cliente'}
            </p>
            <div className='rounded-lg border border-border p-3'>
              {(receipt.sale_items ?? []).map((item) => (
                <p key={item.id} className='flex justify-between py-0.5'>
                  <span>
                    {item.quantity} × {item.products?.name ?? 'Producto'}
                  </span>
                  <span>{formatCurrency(item.line_total)}</span>
                </p>
              ))}
            </div>
            <div>
              <p className='flex justify-between'>
                <span>Subtotal</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </p>
              <p className='flex justify-between'>
                <span>Descuento</span>
                <span>{formatCurrency(receipt.discount_amount)}</span>
              </p>
              <p className='flex justify-between border-t border-border pt-1 text-base font-semibold'>
                <span>Total</span>
                <span>{formatCurrency(receipt.total)}</span>
              </p>
            </div>
            <div>
              <p className='text-xs text-text-secondary'>Pagos</p>
              {(receipt.payments ?? []).map((payment) => (
                <p key={payment.id} className='flex justify-between'>
                  <span>{PAYMENT_METHOD_LABELS[payment.payment_method]}</span>
                  <span>{formatCurrency(payment.amount)}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
