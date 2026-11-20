import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BellRing, Eye, MessageCircle, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useAsync } from '@/hooks/useAsync'
import { listCustomers } from '@/services/customers'
import { listServiceCatalog } from '@/services/catalog'
import {
  listPendingGarments,
  listPickupGarments,
  listRepairOrders,
  logGarmentNotification,
} from '@/services/repairs'
import type { PickupRow } from '@/types'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  GARMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  NOTIFICATION_METHOD_LABELS,
  NOTIFICATION_RESULT_LABELS,
  whatsappLink,
} from '@/lib/format'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { statusTone } from '@/lib/statusTone'
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
import { NewOrderModal } from '@/features/repairs/NewOrderModal'
import { cn } from '@/lib/utils'

type Tab = 'orders' | 'pickup' | 'pending'

export default function Arreglos() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('orders')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [notifyTarget, setNotifyTarget] = useState<PickupRow | null>(null)
  const [notifyMethod, setNotifyMethod] =
    useState<'whatsapp' | 'phone_call' | 'in_person' | 'other'>('whatsapp')
  const [notifyResult, setNotifyResult] = useState('contacted')
  const [notifyNotes, setNotifyNotes] = useState('')
  const [notifying, setNotifying] = useState(false)

  const ordersQuery = useAsync(
    () => listRepairOrders({ status: status || undefined }),
    [status],
  )
  const pickupQuery = useAsync(() => listPickupGarments(), [])
  const pendingQuery = useAsync(() => listPendingGarments(), [])
  const customersQuery = useAsync(() => listCustomers(), [])
  const servicesQuery = useAsync(() => listServiceCatalog(), [])

  const orders = ordersQuery.data ?? []
  const term = search.trim().toLowerCase()
  const filteredOrders = term
    ? orders.filter(
        (order) =>
          String(order.order_number).includes(term) ||
          (order.customers?.full_name ?? '').toLowerCase().includes(term),
      )
    : orders

  const pickup = pickupQuery.data ?? []
  const pending = pendingQuery.data ?? []

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'orders', label: 'Órdenes' },
    { value: 'pickup', label: 'Por retirar', count: pickup.length },
    { value: 'pending', label: 'En proceso', count: pending.length },
  ]

  async function submitNotification() {
    if (!notifyTarget) return
    setNotifying(true)
    try {
      await logGarmentNotification({
        garmentId: notifyTarget.garment_id,
        method: notifyMethod,
        result: notifyResult,
        notes: notifyNotes.trim() || null,
      })
      toast.success('Aviso registrado')
      setNotifyTarget(null)
      setNotifyNotes('')
      pickupQuery.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar')
    } finally {
      setNotifying(false)
    }
  }

  return (
    <div>
      <PageHeader
        title='Arreglos'
        description='Órdenes de arreglo, prendas en proceso y retiros'
        actions={
          <Button onClick={() => setNewOrderOpen(true)}>
            <Plus className='h-4 w-4' /> Nueva orden
          </Button>
        }
      />

      <div className='mb-4 flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 sm:w-fit'>
        {tabs.map((item) => (
          <button
            key={item.value}
            type='button'
            onClick={() => setTab(item.value)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium',
              tab === item.value
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {item.label}
            {typeof item.count === 'number' && item.count > 0 ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px]',
                  tab === item.value ? 'bg-white/20' : 'bg-muted',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'orders' ? (
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-end gap-2'>
            <Field label='Buscar' className='min-w-56 flex-1'>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary' />
                <Input
                  className='pl-9'
                  placeholder='N° de orden o cliente'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </Field>
            <Field label='Estado' className='w-44'>
              <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value=''>Todas</option>
                <option value='open'>Abiertas</option>
                <option value='completed'>Completadas</option>
                <option value='cancelled'>Canceladas</option>
              </Select>
            </Field>
          </div>

          {ordersQuery.loading ? <LoadingBlock /> : null}
          {ordersQuery.error ? (
            <ErrorBlock message={ordersQuery.error} onRetry={ordersQuery.reload} />
          ) : null}
          {!ordersQuery.loading && filteredOrders.length === 0 ? (
            <EmptyState
              title='Sin órdenes'
              description='Crea una orden de arreglo para comenzar.'
              action={
                <Button size='sm' onClick={() => setNewOrderOpen(true)}>
                  Nueva orden
                </Button>
              }
            />
          ) : null}

          {filteredOrders.length > 0 ? (
            <div className='rounded-xl border border-border bg-surface shadow-soft'>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>N°</Th>
                    <Th>Cliente</Th>
                    <Th>Recibida</Th>
                    <Th>Prendas</Th>
                    <Th>Total</Th>
                    <Th>Estado</Th>
                    <Th className='text-right'>Ver</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const garmentCount = order.repair_garments?.length ?? 0
                    const readyCount = (order.repair_garments ?? []).filter(
                      (garment) => garment.status === 'ready',
                    ).length
                    return (
                      <tr key={order.id} className='hover:bg-muted/40 cursor-pointer' onClick={()=>navigate(`/arreglos/${order.id}`)}>
                        <Td className='font-medium'>#{order.order_number}</Td>
                        <Td>{order.customers?.full_name ?? 'Cliente'}</Td>
                        <Td>{formatDate(order.received_at)}</Td>
                        <Td>
                          {garmentCount} prenda(s)
                          {readyCount > 0 ? (
                            <span className='ml-2 text-xs text-success'>
                              {readyCount} lista(s)
                            </span>
                          ) : null}
                        </Td>
                        <Td>{formatCurrency(order.total)}</Td>
                        <Td>
                          <Badge tone={statusTone(order.status)}>
                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </Td>
                        <Td>
                          <div className='flex justify-end'>
                            <Link to={`/arreglos/${order.id}`}>
                              <Button variant='ghost' size='icon'>
                                <Eye className='h-4 w-4' />
                              </Button>
                            </Link>
                          </div>
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </TableWrap>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'pickup' ? (
        <div className='flex flex-col gap-3'>
          {pickupQuery.loading ? <LoadingBlock /> : null}
          {pickupQuery.error ? (
            <ErrorBlock message={pickupQuery.error} onRetry={pickupQuery.reload} />
          ) : null}
          {!pickupQuery.loading && pickup.length === 0 ? (
            <EmptyState
              title='Sin prendas listas'
              description='Cuando una prenda pase a “Lista para retirar” aparecerá aquí.'
            />
          ) : null}
          {pickup.length > 0 ? (
            <div className='rounded-xl border border-border bg-surface shadow-soft'>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Orden</Th>
                    <Th>Cliente</Th>
                    <Th>Prenda</Th>
                    <Th>Lista desde</Th>
                    <Th>Días</Th>
                    <Th>Guarda</Th>
                    <Th>Saldo</Th>
                    <Th>Último aviso</Th>
                    <Th className='text-right'>Aviso</Th>
                  </tr>
                </thead>
                <tbody>
                  {pickup.map((row) => {
                    const link = whatsappLink(
                      row.whatsapp ?? row.phone,
                      `Hola ${row.customer_name}, tu ${row.garment_type} ya está listo para retirar. Te esperamos.`,
                    )
                    return (
                      <tr key={row.garment_id} className='hover:bg-muted/40'>
                        <Td className='font-medium'>#{row.order_number}</Td>
                        <Td>
                          <p>{row.customer_name}</p>
                          <p className='text-xs text-text-secondary'>
                            {row.phone ?? 'Sin teléfono'}
                          </p>
                        </Td>
                        <Td>
                          {row.garment_type}
                          {row.color ? ` · ${row.color}` : ''}
                        </Td>
                        <Td>{formatDate(row.ready_at)}</Td>
                        <Td>
                          {formatNumber(row.days_since_ready)} días
                          {row.days_over_grace > 0 ? (
                            <span className='block text-xs text-danger'>
                              {row.days_over_grace} sobre gracia
                            </span>
                          ) : (
                            <span className='block text-xs text-text-secondary'>
                              Gracia {row.storage_grace_days} días
                            </span>
                          )}
                        </Td>
                        <Td>
                          {row.storage_fee_due > 0 ? (
                            <span className='font-medium text-warning'>
                              {formatCurrency(row.storage_fee_due)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </Td>
                        <Td className='font-medium'>
                          {formatCurrency(row.balance_due)}
                        </Td>
                        <Td>
                          {row.last_notified_at
                            ? formatDateTime(row.last_notified_at)
                            : 'Sin avisos'}
                        </Td>
                        <Td>
                          <div className='flex justify-end gap-1'>
                            {link ? (
                              <a href={link} target='_blank' rel='noreferrer'>
                                <Button variant='ghost' size='icon' title='Abrir WhatsApp'>
                                  <MessageCircle className='h-4 w-4 text-success' />
                                </Button>
                              </a>
                            ) : null}
                            <Button
                              variant='ghost'
                              size='icon'
                              title='Registrar aviso'
                              onClick={() => {
                                setNotifyTarget(row)
                                setNotifyMethod('whatsapp')
                                setNotifyResult('contacted')
                                setNotifyNotes('')
                              }}
                            >
                              <BellRing className='h-4 w-4' />
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </TableWrap>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'pending' ? (
        <div className='flex flex-col gap-3'>
          {pendingQuery.loading ? <LoadingBlock /> : null}
          {pendingQuery.error ? (
            <ErrorBlock message={pendingQuery.error} onRetry={pendingQuery.reload} />
          ) : null}
          {!pendingQuery.loading && pending.length === 0 ? (
            <EmptyState title='Sin prendas en proceso' />
          ) : null}
          {pending.length > 0 ? (
            <div className='rounded-xl border border-border bg-surface shadow-soft'>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Orden</Th>
                    <Th>Cliente</Th>
                    <Th>Prenda</Th>
                    <Th>Trabajo</Th>
                    <Th>Estado</Th>
                    <Th>Recibida</Th>
                    <Th>Entrega estimada</Th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((row) => (
                    <tr key={row.garment_id} className='hover:bg-muted/40'>
                      <Td className='font-medium'>#{row.order_number}</Td>
                      <Td>{row.customer_name}</Td>
                      <Td>
                        {row.garment_type}
                        {row.color ? ` · ${row.color}` : ''}
                      </Td>
                      <Td className='max-w-56 truncate'>{row.requested_work}</Td>
                      <Td>
                        <Badge tone={statusTone(row.status)}>
                          {GARMENT_STATUS_LABELS[row.status] ?? row.status}
                        </Badge>
                      </Td>
                      <Td>{formatDate(row.received_at)}</Td>
                      <Td>
                        {formatDate(row.estimated_ready_at)}
                        {row.is_late ? (
                          <Badge tone='danger' className='ml-2'>
                            Atrasada
                          </Badge>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          ) : null}
        </div>
      ) : null}

      {newOrderOpen ? (
      <NewOrderModal
        open
        customers={customersQuery.data ?? []}
        services={servicesQuery.data ?? []}
        onClose={() => setNewOrderOpen(false)}
        onCreated={(orderId) => {
          ordersQuery.reload()
          navigate(`/arreglos/${orderId}`)
        }}
      />
      ) : null}

      <Modal
        open={notifyTarget !== null}
        onClose={() => setNotifyTarget(null)}
        title='Registrar aviso al cliente'
        description={
          notifyTarget
            ? `Orden #${notifyTarget.order_number} · ${notifyTarget.customer_name}`
            : undefined
        }
        footer={
          <>
            <Button variant='outline' onClick={() => setNotifyTarget(null)}>
              Cancelar
            </Button>
            <Button loading={notifying} onClick={submitNotification}>
              Registrar
            </Button>
          </>
        }
      >
        <div className='flex flex-col gap-3'>
          <Field label='Medio'>
            <Select
              value={notifyMethod}
              onChange={(event) =>
                setNotifyMethod(
                  event.target.value as typeof notifyMethod,
                )
              }
            >
              {Object.entries(NOTIFICATION_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label='Resultado'>
            <Select
              value={notifyResult}
              onChange={(event) => setNotifyResult(event.target.value)}
            >
              {Object.entries(NOTIFICATION_RESULT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label='Notas'>
            <Textarea
              value={notifyNotes}
              onChange={(event) => setNotifyNotes(event.target.value)}
              placeholder='Opcional'
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
