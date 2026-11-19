import { useEffect, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createCategory,
  createSupplier,
  listCategories,
  listSuppliers,
  updateCategory,
  updateSupplier,
} from '@/services/catalog'
import type { Category, Supplier } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const emptySupplier = {
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

export function CatalogModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const [tab, setTab] = useState<'categories' | 'suppliers'>('categories')
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState(emptySupplier)
  const [saving, setSaving] = useState(false)

  async function refresh() {
    try {
      const [cats, sups] = await Promise.all([
        listCategories(true),
        listSuppliers(true),
      ])
      setCategories(cats)
      setSuppliers(sups)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar')
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([listCategories(true), listSuppliers(true)])
      .then(([cats, sups]) => {
        if (!active) return
        setCategories(cats)
        setSuppliers(sups)
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'Error al cargar'),
      )
    return () => {
      active = false
    }
  }, [])

  function resetCategory() {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDescription('')
  }

  async function saveCategory() {
    if (!categoryName.trim()) {
      toast.error('Ingresa el nombre de la categoría')
      return
    }
    setSaving(true)
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: categoryName.trim(),
          description: categoryDescription.trim() || null,
          is_active: editingCategory.is_active,
        })
      } else {
        await createCategory({
          name: categoryName.trim(),
          description: categoryDescription.trim() || null,
        })
      }
      resetCategory()
      await refresh()
      onChanged()
      toast.success('Categoría guardada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleCategory(category: Category) {
    try {
      await updateCategory(category.id, {
        name: category.name,
        description: category.description,
        is_active: !category.is_active,
      })
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
    }
  }

  function resetSupplier() {
    setEditingSupplier(null)
    setSupplierForm(emptySupplier)
  }

  async function saveSupplier() {
    if (!supplierForm.name.trim()) {
      toast.error('Ingresa el nombre del proveedor')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: supplierForm.name.trim(),
        contact_name: supplierForm.contact_name.trim() || null,
        phone: supplierForm.phone.trim() || null,
        email: supplierForm.email.trim() || null,
        address: supplierForm.address.trim() || null,
        notes: supplierForm.notes.trim() || null,
        is_active: editingSupplier?.is_active ?? true,
      }
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload)
      } else {
        await createSupplier(payload)
      }
      resetSupplier()
      await refresh()
      onChanged()
      toast.success('Proveedor guardado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleSupplier(supplier: Supplier) {
    try {
      await updateSupplier(supplier.id, {
        name: supplier.name,
        contact_name: supplier.contact_name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        notes: supplier.notes,
        is_active: !supplier.is_active,
      })
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title='Categorías y proveedores' size='xl'>
      <div className='mb-4 flex gap-1 rounded-lg border border-border p-1'>
        {(['categories', 'suppliers'] as const).map((value) => (
          <button
            key={value}
            type='button'
            onClick={() => setTab(value)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium',
              tab === value ? 'bg-primary text-white' : 'text-text-secondary',
            )}
          >
            {value === 'categories' ? 'Categorías' : 'Proveedores'}
          </button>
        ))}
      </div>

      {tab === 'categories' ? (
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='flex flex-col gap-2'>
            <Field label={editingCategory ? 'Editar categoría' : 'Nueva categoría'}>
              <Input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder='Nombre'
              />
            </Field>
            <Field label='Descripción'>
              <Textarea
                className='min-h-14'
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
              />
            </Field>
            <div className='flex gap-2'>
              <Button size='sm' loading={saving} onClick={saveCategory}>
                <Plus className='h-3.5 w-3.5' />
                {editingCategory ? 'Guardar cambios' : 'Agregar'}
              </Button>
              {editingCategory ? (
                <Button size='sm' variant='ghost' onClick={resetCategory}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </div>
          <ul className='max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border'>
            {categories.length === 0 ? (
              <li className='p-3 text-sm text-text-secondary'>Sin categorías</li>
            ) : (
              categories.map((category) => (
                <li
                  key={category.id}
                  className='flex items-center justify-between gap-2 px-3 py-2'
                >
                  <div className='min-w-0'>
                    <p className='truncate text-sm'>{category.name}</p>
                    {!category.is_active ? <Badge tone='danger'>Inactiva</Badge> : null}
                  </div>
                  <div className='flex gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => {
                        setEditingCategory(category)
                        setCategoryName(category.name)
                        setCategoryDescription(category.description ?? '')
                      }}
                    >
                      <Pencil className='h-3.5 w-3.5' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => toggleCategory(category)}
                    >
                      {category.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='flex flex-col gap-2'>
            <Field label={editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}>
              <Input
                value={supplierForm.name}
                onChange={(event) =>
                  setSupplierForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder='Nombre'
              />
            </Field>
            <Field label='Contacto'>
              <Input
                value={supplierForm.contact_name}
                onChange={(event) =>
                  setSupplierForm((current) => ({
                    ...current,
                    contact_name: event.target.value,
                  }))
                }
              />
            </Field>
            <div className='grid grid-cols-2 gap-2'>
              <Field label='Teléfono'>
                <Input
                  value={supplierForm.phone}
                  onChange={(event) =>
                    setSupplierForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label='Correo'>
                <Input
                  value={supplierForm.email}
                  onChange={(event) =>
                    setSupplierForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label='Dirección'>
              <Input
                value={supplierForm.address}
                onChange={(event) =>
                  setSupplierForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label='Notas'>
              <Textarea
                className='min-h-14'
                value={supplierForm.notes}
                onChange={(event) =>
                  setSupplierForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </Field>
            <div className='flex gap-2'>
              <Button size='sm' loading={saving} onClick={saveSupplier}>
                <Plus className='h-3.5 w-3.5' />
                {editingSupplier ? 'Guardar cambios' : 'Agregar'}
              </Button>
              {editingSupplier ? (
                <Button size='sm' variant='ghost' onClick={resetSupplier}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </div>
          <ul className='max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border'>
            {suppliers.length === 0 ? (
              <li className='p-3 text-sm text-text-secondary'>Sin proveedores</li>
            ) : (
              suppliers.map((supplier) => (
                <li
                  key={supplier.id}
                  className='flex items-center justify-between gap-2 px-3 py-2'
                >
                  <div className='min-w-0'>
                    <p className='truncate text-sm'>{supplier.name}</p>
                    <p className='text-xs text-text-secondary'>
                      {supplier.contact_name || supplier.phone || 'Sin contacto'}
                    </p>
                  </div>
                  <div className='flex gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => {
                        setEditingSupplier(supplier)
                        setSupplierForm({
                          name: supplier.name,
                          contact_name: supplier.contact_name ?? '',
                          phone: supplier.phone ?? '',
                          email: supplier.email ?? '',
                          address: supplier.address ?? '',
                          notes: supplier.notes ?? '',
                        })
                      }}
                    >
                      <Pencil className='h-3.5 w-3.5' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => toggleSupplier(supplier)}
                    >
                      {supplier.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </Modal>
  )
}
