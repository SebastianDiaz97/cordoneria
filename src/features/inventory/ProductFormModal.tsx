import { useState } from 'react'
import { toast } from 'sonner'
import { createProduct, updateProduct, type ProductInput } from '@/services/catalog'
import type { Category, Product, Supplier } from '@/types'
import { PRODUCT_UNITS } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

const emptyForm = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  category_id: '',
  default_supplier_id: '',
  unit: 'unidad',
  cost_price: '0',
  sale_price: '0',
  minimum_stock: '0',
  is_active: true,
}

function initialForm(product: Product | null) {
  if (!product) return emptyForm
  return {
    name: product.name,
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
    description: product.description ?? '',
    category_id: product.category_id ?? '',
    default_supplier_id: product.default_supplier_id ?? '',
    unit: product.unit,
    cost_price: String(product.cost_price),
    sale_price: String(product.sale_price),
    minimum_stock: String(product.minimum_stock),
    is_active: product.is_active,
  }
}

export function ProductFormModal({
  open,
  product,
  categories,
  suppliers,
  onClose,
  onSaved,
}: {
  open: boolean
  product: Product | null
  categories: Category[]
  suppliers: Supplier[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(() => initialForm(product))
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error('El nombre del producto es obligatorio')
      return
    }
    if (Number(form.sale_price) < 0 || Number(form.cost_price) < 0) {
      toast.error('Los precios no pueden ser negativos')
      return
    }
    const payload: ProductInput = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim() || null,
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      default_supplier_id: form.default_supplier_id || null,
      unit: form.unit,
      cost_price: Number(form.cost_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      minimum_stock: Number(form.minimum_stock) || 0,
      is_active: form.is_active,
    }
    setSaving(true)
    try {
      if (product) {
        await updateProduct(product.id, payload)
        toast.success('Producto actualizado')
      } else {
        await createProduct(payload)
        toast.success('Producto creado')
      }
      onSaved()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      description='El stock se modifica solo mediante movimientos y compras.'
      size='lg'
      footer={
        <>
          <Button variant='outline' onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={submit}>
            Guardar
          </Button>
        </>
      }
    >
      <div className='grid gap-3 sm:grid-cols-2'>
        <Field label='Nombre' className='sm:col-span-2'>
          <Input value={form.name} onChange={(event) => set('name', event.target.value)} />
        </Field>
        <Field label='SKU'>
          <Input value={form.sku} onChange={(event) => set('sku', event.target.value)} />
        </Field>
        <Field label='Código de barras'>
          <Input value={form.barcode} onChange={(event) => set('barcode', event.target.value)} />
        </Field>
        <Field label='Categoría'>
          <Select
            value={form.category_id}
            onChange={(event) => set('category_id', event.target.value)}
          >
            <option value=''>Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label='Proveedor'>
          <Select
            value={form.default_supplier_id}
            onChange={(event) => set('default_supplier_id', event.target.value)}
          >
            <option value=''>Sin proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label='Unidad'>
          <Select value={form.unit} onChange={(event) => set('unit', event.target.value)}>
            {PRODUCT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
        </Field>
        <Field label='Stock mínimo'>
          <Input
            type='number'
            min={0}
            step='any'
            value={form.minimum_stock}
            onChange={(event) => set('minimum_stock', event.target.value)}
          />
        </Field>
        <Field label='Costo'>
          <Input
            type='number'
            min={0}
            step={1}
            value={form.cost_price}
            onChange={(event) => set('cost_price', event.target.value)}
          />
        </Field>
        <Field label='Precio de venta'>
          <Input
            type='number'
            min={0}
            step={1}
            value={form.sale_price}
            onChange={(event) => set('sale_price', event.target.value)}
          />
        </Field>
        <Field label='Descripción' className='sm:col-span-2'>
          <Textarea
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </Field>
        <label className='flex items-center gap-2 text-sm sm:col-span-2'>
          <input
            type='checkbox'
            checked={form.is_active}
            onChange={(event) => set('is_active', event.target.checked)}
            className='h-4 w-4 accent-primary'
          />
          Producto activo (visible para vender)
        </label>
      </div>
    </Modal>
  )
}
