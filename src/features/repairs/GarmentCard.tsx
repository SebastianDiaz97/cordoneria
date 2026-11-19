import {
  Banknote,
  BellRing,
  CheckCircle2,
  Package,
  Pencil,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react'
import type {
  GarmentStatus,
  Payment,
  RepairGarment,
  RepairMaterial,
  StatusHistoryEntry,
  NotificationEntry,
} from '@/types'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  GARMENT_STATUS_LABELS,
  NOTIFICATION_METHOD_LABELS,
  NOTIFICATION_RESULT_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
} from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { statusTone } from '@/lib/statusTone'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function GarmentCard({
  garment,
  payments,
  history,
  notifications,
  balance,
  isAdmin,
  onStatus,
  onDeliver,
  onCancel,
  onAddPayment,
  onAddMaterial,
  onEditServices,
  onNotify,
  onVoidMaterial,
}: {
  garment: RepairGarment
  payments: Payment[]
  history: StatusHistoryEntry[]
  notifications: NotificationEntry[]
  balance: number
  isAdmin: boolean
  onStatus: (status: GarmentStatus) => void
  onDeliver: () => void
  onCancel: () => void
  onAddPayment: () => void
  onAddMaterial: () => void
  onEditServices: () => void
  onNotify: () => void
  onVoidMaterial: (material: RepairMaterial) => void
}) {
  const paid = payments.reduce(
    (total, payment) =>
      total +
      (payment.payment_type === 'refund'
        ? -Number(payment.amount)
        : Number(payment.amount)),
    0,
  )
  const active = garment.status !== 'delivered' && garment.status !== 'cancelled'
  const materials = garment.repair_materials ?? []
  const services = garment.repair_garment_services ?? []

  return (
    <div className='rounded-xl border border-border bg-surface shadow-soft'>
      <div className='flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3'>
        <div>
          <h3 className='text-sm font-semibold'>
            Prenda {garment.garment_number}: {garment.garment_type}
            {garment.color ? ` · ${garment.color}` : ''}
          </h3>
          <p className='mt-0.5 text-xs text-text-secondary'>
            Recibida {formatDate(garment.received_at)} · Entrega estimada{' '}
            {formatDate(garment.estimated_ready_at)}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge tone={statusTone(garment.status)}>
            {GARMENT_STATUS_LABELS[garment.status] ?? garment.status}
          </Badge>
          <span className='text-sm font-semibold'>
            {formatCurrency(garment.service_price)}
          </span>
        </div>
      </div>

      <div className='grid gap-4 p-4 lg:grid-cols-2'>
        <div className='flex flex-col gap-2 text-sm'>
          <p>
            <span className='text-text-secondary'>Trabajo: </span>
            {garment.requested_work}
          </p>
          {garment.description ? (
            <p>
              <span className='text-text-secondary'>Descripción: </span>
              {garment.description}
            </p>
          ) : null}
          {garment.condition_on_receipt ? (
            <p>
              <span className='text-text-secondary'>Condición: </span>
              {garment.condition_on_receipt}
            </p>
          ) : null}
          {garment.internal_notes ? (
            <p>
              <span className='text-text-secondary'>Notas internas: </span>
              {garment.internal_notes}
            </p>
          ) : null}

          <div className='mt-1 rounded-lg bg-muted/50 p-3'>
            <p className='flex justify-between'>
              <span className='text-text-secondary'>Precio del arreglo</span>
              <span>{formatCurrency(garment.service_price)}</span>
            </p>
            <p className='flex justify-between'>
              <span className='text-text-secondary'>Pagado</span>
              <span>{formatCurrency(paid)}</span>
            </p>
            {garment.status === 'delivered' ? (
              <p className='flex justify-between'>
                <span className='text-text-secondary'>Guarda cobrada</span>
                <span>{formatCurrency(garment.storage_fee_charged ?? 0)}</span>
              </p>
            ) : null}
            <p className='mt-1 flex justify-between border-t border-border pt-1 font-semibold'>
              <span>Saldo</span>
              <span className={cn(balance > 0 ? 'text-danger' : 'text-success')}>
                {formatCurrency(balance)}
              </span>
            </p>
          </div>

          {garment.storage_terms_accepted ? (
            <p className='text-xs text-text-secondary'>
              Condiciones de guarda aceptadas
              {garment.storage_terms_accepted_at
                ? ` el ${formatDateTime(garment.storage_terms_accepted_at)}`
                : ''}
              {' · '}
              {garment.storage_grace_days} días de gracia ·{' '}
              {garment.storage_fee_mode === 'none'
                ? 'sin cobro'
                : garment.storage_fee_mode === 'per_day'
                  ? `${formatCurrency(garment.storage_fee_amount)} por día`
                  : `${formatCurrency(garment.storage_fee_amount)} fijo`}
            </p>
          ) : null}

          <div className='mt-1 flex flex-wrap gap-1.5'>
            {active ? (
              <>
                {garment.status === 'received' ? (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => onStatus('in_progress')}
                  >
                    Iniciar trabajo
                  </Button>
                ) : null}
                {garment.status !== 'ready' ? (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => onStatus('ready')}
                  >
                    <CheckCircle2 className='h-3.5 w-3.5' /> Marcar lista
                  </Button>
                ) : null}
                <Button size='sm' variant='outline' onClick={onAddPayment}>
                  <Banknote className='h-3.5 w-3.5' /> Registrar pago
                </Button>
                <Button size='sm' variant='outline' onClick={onAddMaterial}>
                  <Package className='h-3.5 w-3.5' /> Material
                </Button>
                <Button size='sm' variant='outline' onClick={onEditServices}>
                  <Pencil className='h-3.5 w-3.5' /> Servicios
                </Button>
                <Button size='sm' variant='outline' onClick={onNotify}>
                  <BellRing className='h-3.5 w-3.5' /> Aviso
                </Button>
              </>
            ) : null}
            {garment.status === 'ready' ? (
              <Button size='sm' onClick={onDeliver}>
                <Truck className='h-3.5 w-3.5' /> Entregar
              </Button>
            ) : null}
            {isAdmin && active ? (
              <Button size='sm' variant='danger' onClick={onCancel}>
                <XCircle className='h-3.5 w-3.5' /> Cancelar prenda
              </Button>
            ) : null}
          </div>
        </div>

        <div className='flex flex-col gap-3 text-sm'>
          <div>
            <p className='mb-1 text-xs font-semibold uppercase text-text-secondary'>
              Servicios
            </p>
            {services.length === 0 ? (
              <p className='text-xs text-text-secondary'>Sin servicios</p>
            ) : (
              <ul className='divide-y divide-border rounded-lg border border-border'>
                {services.map((service) => (
                  <li
                    key={service.id}
                    className='flex items-center justify-between gap-2 px-2.5 py-1.5'
                  >
                    <span>
                      {service.description}
                      {Number(service.quantity) !== 1
                        ? ` × ${formatNumber(service.quantity, 2)}`
                        : ''}
                    </span>
                    <span className='font-medium'>
                      {formatCurrency(service.line_total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className='mb-1 text-xs font-semibold uppercase text-text-secondary'>
              Materiales
            </p>
            {materials.length === 0 ? (
              <p className='text-xs text-text-secondary'>Sin materiales</p>
            ) : (
              <ul className='divide-y divide-border rounded-lg border border-border'>
                {materials.map((material) => (
                  <li
                    key={material.id}
                    className='flex items-center justify-between gap-2 px-2.5 py-1.5'
                  >
                    <span
                      className={cn(
                        material.voided_at && 'text-text-secondary line-through',
                      )}
                    >
                      {material.products?.name ?? 'Producto'} ·{' '}
                      {formatNumber(material.quantity, 2)}
                    </span>
                    <span className='flex items-center gap-1'>
                      <span>{formatCurrency(material.unit_cost)}</span>
                      {!material.voided_at && active ? (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7'
                          title='Anular material'
                          onClick={() => onVoidMaterial(material)}
                        >
                          <Trash2 className='h-3.5 w-3.5 text-danger' />
                        </Button>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className='mb-1 text-xs font-semibold uppercase text-text-secondary'>
              Pagos
            </p>
            {payments.length === 0 ? (
              <p className='text-xs text-text-secondary'>Sin pagos</p>
            ) : (
              <ul className='divide-y divide-border rounded-lg border border-border'>
                {payments.map((payment) => (
                  <li
                    key={payment.id}
                    className='flex items-center justify-between gap-2 px-2.5 py-1.5'
                  >
                    <span className='text-xs'>
                      {PAYMENT_TYPE_LABELS[payment.payment_type] ?? 'Pago'} ·{' '}
                      {PAYMENT_METHOD_LABELS[payment.payment_method]} ·{' '}
                      {formatDateTime(payment.paid_at)}
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        payment.payment_type === 'refund' && 'text-danger',
                      )}
                    >
                      {payment.payment_type === 'refund' ? '-' : ''}
                      {formatCurrency(payment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className='rounded-lg border border-border'>
            <summary className='cursor-pointer px-2.5 py-2 text-xs font-semibold uppercase text-text-secondary'>
              Historial de estados ({history.length})
            </summary>
            <ul className='max-h-40 divide-y divide-border overflow-y-auto'>
              {history.map((entry) => (
                <li key={entry.id} className='flex justify-between px-2.5 py-1.5 text-xs'>
                  <span>
                    {entry.previous_status
                      ? `${GARMENT_STATUS_LABELS[entry.previous_status] ?? entry.previous_status} → `
                      : ''}
                    {GARMENT_STATUS_LABELS[entry.new_status] ?? entry.new_status}
                  </span>
                  <span className='text-text-secondary'>
                    {formatDateTime(entry.changed_at)}
                  </span>
                </li>
              ))}
            </ul>
          </details>

          <details className='rounded-lg border border-border'>
            <summary className='cursor-pointer px-2.5 py-2 text-xs font-semibold uppercase text-text-secondary'>
              Avisos ({notifications.length})
            </summary>
            <ul className='max-h-40 divide-y divide-border overflow-y-auto'>
              {notifications.map((entry) => (
                <li key={entry.id} className='flex justify-between px-2.5 py-1.5 text-xs'>
                  <span>
                    {NOTIFICATION_METHOD_LABELS[entry.method] ?? entry.method} ·{' '}
                    {NOTIFICATION_RESULT_LABELS[entry.result] ?? entry.result}
                    {entry.notes ? ` · ${entry.notes}` : ''}
                  </span>
                  <span className='text-text-secondary'>
                    {formatDateTime(entry.notified_at)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </div>
  )
}
