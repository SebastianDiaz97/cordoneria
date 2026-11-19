import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { receivePurchase } from '@/services/inventory'
import type { Product, Supplier } from '@/types'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

type SelectProduct = Pick<
  Product,
  'id' | 'name' | 'sku' | 'unit' | 'cost_price'
>

interface Line {
  key: string
  productId: string
  quantity: string
  unitCost: string
  discount: string
}

function newLine(): Line {
  return {
    key: crypto.randomUUID(),
    productId: '',
    quantity: '1',
    unitCost: '0',
    discount: '0',
  }
}

export function PurchaseFormModal({
  open,
  products,
  suppliers,
  onClose,
  onSaved,
}: {
  open: boolean
  products: SelectProduct[]
  suppliers: Supplier[]
  onClose: () => void
  onSaved: () => void
}) {
  const [supplierId, setSupplierId] = useState('')
  const [invoice, setInvoice] = useState('')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState('0')
  const [lines, setLines] = useState<Line[]>(() => [newLine()])
  const [saving, setSaving] = useState(false)

  const subtotal = useMemo(
    () =>
      lines.reduce((total, line) => {
        const qty = Number(line.quantity) || 0
        const cost = Number(line.unitCost) || 0
        const disc = Number(line.discount) || 0
        return total + Math.max(qty * cost - disc, 0)
      }, 0),
    [lines],
  )
  const total = Math.max(subtotal - (Number(discount) || 0), 0)

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    )
  }

  async function submit() {
    const validLines = lines.filter(
      (line) =>
        line.productId &&
        Number(line.quantity) > 0 &&
        Number(line.unitCost) >= 0,
    )
    if (validLines.length === 0) {
      toast.error('Agrega al menos un producto con cantidad y costo válidos')
      return
    }
    setSaving(true)
    try {
      await receivePurchase({
        items: validLines.map((line) => ({
          product_id: line.productId,
          quantity: Number(line.quantity),
          unit_cost: Number(line.unitCost),
          discount_amount: Number(line.discount) || 0,
        })),
        supplierId: supplierId || null,
        invoiceReference: invoice.trim() || null,
        discountAmount: Number(discount) || 0,
        notes: notes.trim() || null,
      })
      toast.success('Compra registrada y stock actualizado')
      onSaved()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title='Registrar compra'
      description='Aumenta el stock y actualiza el costo de los productos.'
      size='xl'
      footer={
        <>
          <Button variant='outline' onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={submit}>
            Recepcionar compra
          </Button>
        </>
      }
    >
      <div className='flex flex-col gap-4'>
        <div className='grid gap-3 sm:grid-cols-3'>
          <Field label='Proveedor'>
            <Select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
            >
              <option value=''>Sin proveedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label='N° factura / referencia'>
            <Input value={invoice} onChange={(event) => setInvoice(event.target.value)} />
          </Field>
          <Field label='Descuento general'>
            <Input
              type='number'
              min={0}
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </Field>
        </div>

        <div className='flex flex-col gap-2'>
          {lines.map((line) => {
            const product = products.find((item) => item.id === line.productId)
            return (
              <div
                key={line.key}
                className='grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]'
              >
                <Field label='Producto'>
                  <Select
                    value={line.productId}
                    onChange={(event) => {
                      const selected = products.find(
                        (item) => item.id === event.target.value,
                      )
                      updateLine(line.key, {
                        productId: event.target.value,
                        unitCost: selected
                          ? String(selected.cost_price)
                          : line.unitCost,
                      })
                    }}
                  >
                    <option value=''>Seleccionar…</option>
                    {products.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.sku ? ` (${item.sku})` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label='Cantidad'>
                  <Input
                    type='number'
                    min={0}
                    step='any'
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.key, { quantity: event.target.value })
                    }
                  />
                </Field>
                <Field label='Costo unitario'>
                  <Input
                    type='number'
                    min={0}
                    value={line.unitCost}
                    onChange={(event) =>
                      updateLine(line.key, { unitCost: event.target.value })
                    }
                  />
                </Field>
                <Field label='Descuento'>
                  <Input
                    type='number'
                    min={0}
                    value={line.discount}
                    onChange={(event) =>
                      updateLine(line.key, { discount: event.target.value })
                    }
                  />
                </Field>
                <div className='flex items-end'>
                  <Button
                    variant='ghost'
                    size='icon'
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((item) => item.key !== line.key),
                      )
                    }
                  >
                    <Trash2 className='h-4 w-4 text-danger' />
                  </Button>
                </div>
                {product ? (
                  <p className='text-[11px] text-text-secondary sm:col-span-5'>
                    {product.unit} · costo actual {formatCurrency(product.cost_price)}
                  </p>
                ) : null}
              </div>
            )
          })}
          <Button
            variant='outline'
            size='sm'
            className='self-start'
            onClick={() => setLines((current) => [...current, newLine()])}
          >
            <Plus className='h-3.5 w-3.5' /> Agregar línea
          </Button>
        </div>

        <Field label='Observaciones'>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>

        <div className='rounded-lg bg-muted/50 p-3 text-sm'>
          <p className='flex justify-between'>
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </p>
          <p className='flex justify-between'>
            <span>Descuento</span>
            <span>-{formatCurrency(Number(discount) || 0)}</span>
          </p>
          <p className='mt-1 flex justify-between border-t border-border pt-1 font-semibold'>
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </p>
        </div>
      </div>
    </Modal>
  )
}
