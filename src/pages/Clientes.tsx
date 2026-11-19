import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Pencil, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useAsync } from '@/hooks/useAsync'
import {
  createCustomer,
  listCustomers,
  updateCustomer,
  type CustomerInput,
} from '@/services/customers'
import type { Customer } from '@/types'
import { formatDate } from '@/lib/format'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/States'

const emptyForm: CustomerInput = {
  full_name: '',
  phone: '',
  whatsapp: '',
  email: '',
  notes: '',
  is_active: true,
}

export default function Clientes() {
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerInput>(emptyForm)
  const [saving, setSaving] = useState(false)

  const { data, loading, error, reload } = useAsync(
    () =>
      listCustomers({
        search,
        includeInactive,
      }),
    [search, includeInactive],
  )

  const customers = data ?? []

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditing(customer)
    setForm({
      full_name: customer.full_name,
      phone: customer.phone ?? '',
      whatsapp: customer.whatsapp ?? '',
      email: customer.email ?? '',
      notes: customer.notes ?? '',
      is_active: customer.is_active,
    })
    setModalOpen(true)
  }

  async function submit() {
    if (!form.full_name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      const payload: CustomerInput = {
        ...form,
        full_name: form.full_name.trim(),
        phone: form.phone?.trim() || null,
        whatsapp: form.whatsapp?.trim() || null,
        email: form.email?.trim() || null,
        notes: form.notes?.trim() || null,
      }
      if (editing) {
        await updateCustomer(editing.id, payload)
        toast.success('Cliente actualizado')
      } else {
        await createCustomer(payload)
        toast.success('Cliente creado')
      }
      setModalOpen(false)
      setEditing(null)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title='Clientes'
        description='Datos de contacto e historial de compras y arreglos'
        actions={
          <Button onClick={openNew}>
            <Plus className='h-4 w-4' /> Nuevo cliente
          </Button>
        }
      />

      <div className='mb-3 flex flex-wrap items-end gap-2'>
        <Field label='Buscar' className='min-w-56 flex-1'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary' />
            <Input
              className='pl-9'
              placeholder='Nombre, teléfono, WhatsApp o correo'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </Field>
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

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {!loading && !error && customers.length === 0 ? (
        <EmptyState
          title='Sin clientes'
          description='Crea el primer cliente para asociarlo a ventas y arreglos.'
        />
      ) : null}

      {customers.length > 0 ? (
        <div className='rounded-xl border border-border bg-surface shadow-soft'>
          <TableWrap>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Teléfono</Th>
                <Th>WhatsApp</Th>
                <Th>Correo</Th>
                <Th>Alta</Th>
                <Th className='text-right'>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className='hover:bg-muted/40'>
                  <Td>
                    <span className='font-medium'>{customer.full_name}</span>
                    {!customer.is_active ? (
                      <Badge tone='danger' className='ml-2'>
                        Inactivo
                      </Badge>
                    ) : null}
                  </Td>
                  <Td>{customer.phone ?? '—'}</Td>
                  <Td>{customer.whatsapp ?? '—'}</Td>
                  <Td>{customer.email ?? '—'}</Td>
                  <Td>{formatDate(customer.created_at)}</Td>
                  <Td>
                    <div className='flex justify-end gap-1'>
                      <Link to={`/clientes/${customer.id}`}>
                        <Button variant='ghost' size='icon' title='Ver historial'>
                          <Eye className='h-4 w-4' />
                        </Button>
                      </Link>
                      <Button
                        variant='ghost'
                        size='icon'
                        title='Editar'
                        onClick={() => openEdit(customer)}
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Editar cliente' : 'Nuevo cliente'}
        size='md'
        footer={
          <>
            <Button
              variant='outline'
              onClick={() => {
                setModalOpen(false)
                setEditing(null)
              }}
            >
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
            <Input
              value={form.full_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, full_name: event.target.value }))
              }
            />
          </Field>
          <Field label='Teléfono'>
            <Input
              value={form.phone ?? ''}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </Field>
          <Field label='WhatsApp'>
            <Input
              value={form.whatsapp ?? ''}
              onChange={(event) =>
                setForm((current) => ({ ...current, whatsapp: event.target.value }))
              }
            />
          </Field>
          <Field label='Correo' className='sm:col-span-2'>
            <Input
              type='email'
              value={form.email ?? ''}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </Field>
          <Field label='Notas' className='sm:col-span-2'>
            <Textarea
              value={form.notes ?? ''}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </Field>
          <label className='flex items-center gap-2 text-sm sm:col-span-2'>
            <input
              type='checkbox'
              className='h-4 w-4 accent-primary'
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
            />
            Cliente activo
          </label>
        </div>
      </Modal>
    </div>
  )
}
