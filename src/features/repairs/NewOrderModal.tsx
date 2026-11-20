import { useState } from 'react'
import { Plus, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createCustomer } from '@/services/customers'
import { createRepairOrder } from '@/services/repairs'
import type { Customer, ServiceCatalogItem } from '@/types'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types'
import { formatCurrency, parseDecimal, PAYMENT_METHOD_LABELS } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

interface ServiceDraft {
  key: string
  serviceId: string
  description: string
  quantity: string
  unitPrice: string
}

interface GarmentDraft {
  key: string
  garment_type: string
  color: string
  description: string
  condition: string
  requested_work: string
  internal_notes: string
  estimated_ready_at: string
  storage_terms_accepted: boolean
  services: ServiceDraft[]
}

function newService(): ServiceDraft {
  return {
    key: crypto.randomUUID(),
    serviceId: '',
    description: '',
    quantity: '1',
    unitPrice: '',
  }
}

function newGarment(): GarmentDraft {
  return {
    key: crypto.randomUUID(),
    garment_type: '',
    color: '',
    description: '',
    condition: '',
    requested_work: '',
    internal_notes: '',
    estimated_ready_at: '',
    storage_terms_accepted: false,
    services: [newService()],
  }
}

export function NewOrderModal({
  open,
  customers,
  services,
  onClose,
  onCreated,
}: {
  open: boolean
  customers: Customer[]
  services: ServiceCatalogItem[]
  onClose: () => void
  onCreated: (orderId: string) => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [extraCustomers, setExtraCustomers] = useState<Customer[]>([])
  const [notes, setNotes] = useState('')
  const [garments, setGarments] = useState<GarmentDraft[]>(() => [newGarment()])
  const [deposit, setDeposit] = useState('0')
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('cash')
  const [saving, setSaving] = useState(false)

  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    full_name: '',
    phone: '',
    whatsapp: '',
  })
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  const allCustomers = [...customers, ...extraCustomers]

  function updateGarment(key: string, patch: Partial<GarmentDraft>) {
    setGarments((current) =>
      current.map((garment) =>
        garment.key === key ? { ...garment, ...patch } : garment,
      ),
    )
  }

  function updateService(
    garmentKey: string,
    serviceKey: string,
    patch: Partial<ServiceDraft>,
  ) {
    setGarments((current) =>
      current.map((garment) =>
        garment.key === garmentKey
          ? {
              ...garment,
              services: garment.services.map((service) =>
                service.key === serviceKey ? { ...service, ...patch } : service,
              ),
            }
          : garment,
      ),
    )
  }

  function serviceLineTotal(service: ServiceDraft) {
    const catalog = services.find((item) => item.id === service.serviceId)
    const price = service.unitPrice !== '' ? Number(service.unitPrice) : catalog?.default_price ?? 0
    return parseDecimal(service.quantity) * (price || 0)
  }

  const orderTotal = garments.reduce(
    (total, garment) =>
      total + garment.services.reduce((sum, service) => sum + serviceLineTotal(service), 0),
    0,
  )
  const depositTendered = Number(deposit) || 0
  const depositApplied =
    depositMethod === 'cash'
      ? Math.min(depositTendered, orderTotal)
      : depositTendered
  const depositChange =
    depositMethod === 'cash'
      ? Math.max(depositTendered - orderTotal, 0)
      : 0

  async function createQuickCustomer() {
    if (!newCustomer.full_name.trim()) {
      toast.error('Ingresa el nombre del cliente')
      return
    }
    setCreatingCustomer(true)
    try {
      const customer = await createCustomer({
        full_name: newCustomer.full_name.trim(),
        phone: newCustomer.phone.trim() || null,
        whatsapp: newCustomer.whatsapp.trim() || null,
        email: null,
        notes: null,
        is_active: true,
      })
      setExtraCustomers((current) => [...current, customer])
      setCustomerId(customer.id)
      setShowNewCustomer(false)
      setNewCustomer({ full_name: '', phone: '', whatsapp: '' })
      toast.success('Cliente creado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el cliente')
    } finally {
      setCreatingCustomer(false)
    }
  }

  async function submit() {
    if (!customerId) {
      toast.error('Selecciona un cliente')
      return
    }
    for (const [index, garment] of garments.entries()) {
      if (!garment.garment_type.trim()) {
        toast.error(`Prenda ${index + 1}: indica el tipo de prenda`)
        return
      }
      if (!garment.requested_work.trim()) {
        toast.error(`Prenda ${index + 1}: describe el trabajo solicitado`)
        return
      }
      const validServices = garment.services.filter(
        (service) =>
          (service.serviceId || service.description.trim()) &&
          parseDecimal(service.quantity) > 0,
      )
      if (validServices.length === 0) {
        toast.error(`Prenda ${index + 1}: agrega al menos un servicio`)
        return
      }
    }
    const depositAmount =
      depositMethod === 'cash'
        ? Math.min(depositTendered, orderTotal)
        : depositTendered
    if (depositMethod !== 'cash' && depositTendered > orderTotal) {
      toast.error('El abono no puede superar el total de la orden')
      return
    }

    setSaving(true)
    try {
      const orderId = await createRepairOrder({
        customerId,
        notes: notes.trim() || null,
        depositAmount,
        depositMethod: depositAmount > 0 ? depositMethod : null,
        garments: garments.map((garment) => ({
          garment_type: garment.garment_type.trim(),
          color: garment.color.trim() || null,
          description: garment.description.trim() || null,
          condition_on_receipt: garment.condition.trim() || null,
          requested_work: garment.requested_work.trim(),
          internal_notes: garment.internal_notes.trim() || null,
          estimated_ready_at: garment.estimated_ready_at
            ? new Date(garment.estimated_ready_at).toISOString()
            : null,
          storage_terms_accepted: garment.storage_terms_accepted,
          services: garment.services
            .filter((service) => service.serviceId || service.description.trim())
            .map((service) => ({
              service_id: service.serviceId || null,
              description: service.serviceId ? null : service.description.trim(),
              quantity: parseDecimal(service.quantity) || 1,
              unit_price: service.unitPrice !== '' ? Number(service.unitPrice) : undefined,
            })),
        })),
      })
      toast.success('Orden de arreglo creada')
      onCreated(orderId)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la orden')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title='Nueva orden de arreglo'
      description='Una orden puede incluir varias prendas, cada una con su precio y seguimiento.'
      size='xl'
      footer={
        <>
          <span className='mr-auto text-sm text-text-secondary'>
            Total orden: <strong className='text-text-primary'>{formatCurrency(orderTotal)}</strong>
          </span>
          <Button variant='outline' onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={submit}>
            Crear orden
          </Button>
        </>
      }
    >
      <div className='flex flex-col gap-4'>
        <div className='rounded-lg border border-border p-3'>
          <div className='flex flex-wrap items-end gap-2'>
            <Field label='Cliente' className='min-w-52 flex-1'>
              <Select
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value=''>Seleccionar cliente…</option>
                {allCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                    {customer.phone ? ` · ${customer.phone}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              variant='outline'
              size='md'
              onClick={() => setShowNewCustomer((value) => !value)}
            >
              <UserPlus className='h-4 w-4' /> Nuevo cliente
            </Button>
          </div>

          {showNewCustomer ? (
            <div className='mt-3 grid gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[1.5fr_1fr_1fr_auto]'>
              <Field label='Nombre'>
                <Input
                  value={newCustomer.full_name}
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      full_name: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label='Teléfono'>
                <Input
                  value={newCustomer.phone}
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label='WhatsApp'>
                <Input
                  value={newCustomer.whatsapp}
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      whatsapp: event.target.value,
                    }))
                  }
                />
              </Field>
              <div className='flex items-end'>
                <Button
                  size='md'
                  loading={creatingCustomer}
                  onClick={createQuickCustomer}
                >
                  Crear
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {garments.map((garment, index) => (
          <div
            key={garment.key}
            className='rounded-lg border border-border p-3'
          >
            <div className='mb-2 flex items-center justify-between'>
              <h3 className='text-sm font-semibold'>Prenda {index + 1}</h3>
              {garments.length > 1 ? (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() =>
                    setGarments((current) =>
                      current.filter((item) => item.key !== garment.key),
                    )
                  }
                >
                  <Trash2 className='h-4 w-4 text-danger' />
                </Button>
              ) : null}
            </div>

            <div className='grid gap-2 sm:grid-cols-3'>
              <Field label='Tipo de prenda'>
                <Input
                  value={garment.garment_type}
                  onChange={(event) =>
                    updateGarment(garment.key, { garment_type: event.target.value })
                  }
                  placeholder='Pantalón, vestido…'
                />
              </Field>
              <Field label='Color'>
                <Input
                  value={garment.color}
                  onChange={(event) =>
                    updateGarment(garment.key, { color: event.target.value })
                  }
                />
              </Field>
              <Field label='Fecha estimada de entrega'>
                <Input
                  type='datetime-local'
                  value={garment.estimated_ready_at}
                  onChange={(event) =>
                    updateGarment(garment.key, {
                      estimated_ready_at: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label='Descripción' className='sm:col-span-3'>
                <Input
                  value={garment.description}
                  onChange={(event) =>
                    updateGarment(garment.key, { description: event.target.value })
                  }
                  placeholder='Características de la prenda'
                />
              </Field>
              <Field label='Condición al recibir' className='sm:col-span-3'>
                <Input
                  value={garment.condition}
                  onChange={(event) =>
                    updateGarment(garment.key, { condition: event.target.value })
                  }
                  placeholder='Manchas, roturas, botones faltantes…'
                />
              </Field>
              <Field label='Trabajo solicitado' className='sm:col-span-3'>
                <Textarea
                  className='min-h-14'
                  value={garment.requested_work}
                  onChange={(event) =>
                    updateGarment(garment.key, { requested_work: event.target.value })
                  }
                  placeholder='Qué debe hacer el arreglo'
                />
              </Field>
              <Field label='Notas internas' className='sm:col-span-3'>
                <Input
                  value={garment.internal_notes}
                  onChange={(event) =>
                    updateGarment(garment.key, { internal_notes: event.target.value })
                  }
                />
              </Field>
            </div>

            <div className='mt-3'>
              <div className='mb-1 flex items-center justify-between'>
                <p className='text-xs font-semibold uppercase text-text-secondary'>
                  Servicios
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    updateGarment(garment.key, {
                      services: [...garment.services, newService()],
                    })
                  }
                >
                  <Plus className='h-3.5 w-3.5' /> Servicio
                </Button>
              </div>
              <div className='flex flex-col gap-2'>
                {garment.services.map((service) => {
                  const catalogItem = services.find(
                    (item) => item.id === service.serviceId,
                  )
                  return (
                    <div
                      key={service.key}
                      className='grid gap-2 rounded-lg bg-muted/40 p-2 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto]'
                    >
                      <Field label='Servicio del catálogo'>
                        <Select
                          value={service.serviceId}
                          onChange={(event) => {
                            const selected = services.find(
                              (item) => item.id === event.target.value,
                            )
                            updateService(garment.key, service.key, {
                              serviceId: event.target.value,
                              unitPrice: selected ? String(selected.default_price) : '',
                            })
                          }}
                        >
                          <option value=''>Personalizado</option>
                          {services.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label='Descripción'>
                        <Input
                          value={
                            service.serviceId
                              ? catalogItem?.name ?? ''
                              : service.description
                          }
                          disabled={Boolean(service.serviceId)}
                          onChange={(event) =>
                            updateService(garment.key, service.key, {
                              description: event.target.value,
                            })
                          }
                          placeholder='Detalle'
                        />
                      </Field>
                      <Field label='Cantidad'>
                        <Input
                          type='text'
                          inputMode='decimal'
                          value={service.quantity}
                          onChange={(event) =>
                            updateService(garment.key, service.key, {
                              quantity: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label='Precio unitario'>
                        <Input
                          type='number'
                          min={0}
                          value={service.unitPrice}
                          onChange={(event) =>
                            updateService(garment.key, service.key, {
                              unitPrice: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <div className='flex items-end justify-end gap-1'>
                        <span className='pb-2 text-xs font-medium'>
                          {formatCurrency(serviceLineTotal(service))}
                        </span>
                        {garment.services.length > 1 ? (
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() =>
                              updateGarment(garment.key, {
                                services: garment.services.filter(
                                  (item) => item.key !== service.key,
                                ),
                              })
                            }
                          >
                            <Trash2 className='h-4 w-4 text-danger' />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <label className='mt-3 flex items-start gap-2 text-xs text-text-secondary'>
              <input
                type='checkbox'
                className='mt-0.5 h-4 w-4 accent-primary'
                checked={garment.storage_terms_accepted}
                onChange={(event) =>
                  updateGarment(garment.key, {
                    storage_terms_accepted: event.target.checked,
                  })
                }
              />
              El cliente acepta las condiciones de almacenamiento y cobro por
              guarda después del plazo de gracia configurado.
            </label>
          </div>
        ))}

        <Button
          variant='outline'
          className='self-start'
          onClick={() => setGarments((current) => [...current, newGarment()])}
        >
          <Plus className='h-4 w-4' /> Agregar prenda
        </Button>

        <div className='grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3'>
          <Field label='Abono inicial (opcional)'>
            <Input
              type='number'
              min={0}
              value={deposit}
              onChange={(event) => setDeposit(event.target.value)}
            />
          </Field>
          <Field label='Método del abono'>
            <Select
              value={depositMethod}
              onChange={(event) =>
                setDepositMethod(event.target.value as PaymentMethod)
              }
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label='Notas de la orden'>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          {depositChange > 0 ? (
            <p className='text-xs font-medium text-success sm:col-span-3'>
              Se registrará un abono de {formatCurrency(depositApplied)} · Vuelto{' '}
              {formatCurrency(depositChange)}
            </p>
          ) : null}
          {depositMethod !== 'cash' && depositTendered > orderTotal ? (
            <p className='text-xs text-danger sm:col-span-3'>
              El abono no puede superar el total de la orden (
              {formatCurrency(orderTotal)}).
            </p>
          ) : null}
          {depositApplied > 0 ? (
            <Badge tone='gold' className='w-fit'>
              Se repartirá entre las prendas en proporción a su precio
            </Badge>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
