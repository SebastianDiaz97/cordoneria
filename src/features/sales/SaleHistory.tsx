import { useMemo, useState } from 'react'
import { Eye, Ban, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { cancelSale, getSale, listSales } from '@/services/sales'
import type { PaymentMethod, Sale } from '@/types'
import { PAYMENT_METHODS } from '@/types'
import {
  endOfDayISO,
  formatCurrency,
  formatDateTime,
  monthStartInput,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  startOfDayISO,
  todayInput,
} from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Field, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/States'

export function SaleHistory() {
  const { isAdmin } = useAuth()
  const [from, setFrom] = useState(monthStartInput())
  const [to, setTo] = useState(todayInput())
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Sale | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null)
  const [reason, setReason] = useState('')
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('cash')
  const [cancelling, setCancelling] = useState(false)

  const { data, loading, error, reload } = useAsync(
    () =>
      listSales({
        from: startOfDayISO(from),
        to: endOfDayISO(to),
        status: status || undefined,
      }),
    [from, to, status],
  )

  const rows = useMemo(() => {
    const list = data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return list
    return list.filter(
      (sale) =>
        String(sale.sale_number).includes(term) ||
        (sale.customers?.full_name ?? '').toLowerCase().includes(term),
    )
  }, [data, search])

  async function openDetail(saleId: string) {
    setDetailLoading(true)
    try {
      setSelected(await getSale(saleId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar la venta')
    } finally {
      setDetailLoading(false)
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    if (!reason.trim()) {
      toast.error('Indica el motivo de la anulación')
      return
    }
    setCancelling(true)
    try {
      const paid = (cancelTarget.payments ?? []).reduce(
        (total, payment) =>
          total +
          (payment.payment_type === 'refund'
            ? -Number(payment.amount)
            : Number(payment.amount)),
        0,
      )
      await cancelSale(
        cancelTarget.id,
        reason.trim(),
        paid > 0 ? refundMethod : null,
      )
      toast.success('Venta anulada correctamente')
      setCancelTarget(null)
      setReason('')
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo anular')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-end gap-2'>
        <Field label='Desde' className='w-40'>
          <Input
            type='date'
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label='Hasta' className='w-40'>
          <Input
            type='date'
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
        <Field label='Estado' className='w-40'>
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value=''>Todas</option>
            <option value='completed'>Completadas</option>
            <option value='cancelled'>Anuladas</option>
          </Select>
        </Field>
        <Field label='Buscar' className='min-w-52 flex-1'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary' />
            <Input
              className='pl-9'
              placeholder='N° de venta o cliente'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </Field>
      </div>

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} onRetry={reload} /> : null}

      {!loading && !error ? (
        rows.length === 0 ? (
          <EmptyState
            title='Sin ventas en el rango'
            description='Ajusta las fechas o registra una nueva venta.'
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>N°</Th>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                <Th>Total</Th>
                <Th>Estado</Th>
                <Th className='text-right'>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((sale) => (
                <tr key={sale.id} className='hover:bg-muted/40'>
                  <Td className='font-medium'>#{sale.sale_number}</Td>
                  <Td>{formatDateTime(sale.sold_at)}</Td>
                  <Td>{sale.customers?.full_name ?? 'Sin cliente'}</Td>
                  <Td className='font-medium'>{formatCurrency(sale.total)}</Td>
                  <Td>
                    <Badge tone={sale.status === 'completed' ? 'success' : 'danger'}>
                      {sale.status === 'completed' ? 'Completada' : 'Anulada'}
                    </Badge>
                  </Td>
                  <Td>
                    <div className='flex justify-end gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        title='Ver detalle'
                        onClick={() => openDetail(sale.id)}
                      >
                        <Eye className='h-4 w-4' />
                      </Button>
                      {isAdmin && sale.status === 'completed' ? (
                        <Button
                          variant='ghost'
                          size='icon'
                          title='Anular venta'
                          onClick={() => {
                            setCancelTarget(sale)
                            setReason('')
                          }}
                        >
                          <Ban className='h-4 w-4 text-danger' />
                        </Button>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )
      ) : null}

      <Modal
        open={detailLoading || selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Venta #${selected.sale_number}` : 'Cargando venta…'}
        size='lg'
        footer={
          <Button variant='outline' onClick={() => setSelected(null)}>
            Cerrar
          </Button>
        }
      >
        {detailLoading ? (
          <LoadingBlock />
        ) : selected ? (
          <div className='flex flex-col gap-4 text-sm'>
            <div className='grid gap-2 sm:grid-cols-2'>
              <p>
                <span className='text-text-secondary'>Fecha: </span>
                {formatDateTime(selected.sold_at)}
              </p>
              <p>
                <span className='text-text-secondary'>Cliente: </span>
                {selected.customers?.full_name ?? 'Sin cliente'}
              </p>
              <p>
                <span className='text-text-secondary'>Estado: </span>
                {selected.status === 'completed' ? 'Completada' : 'Anulada'}
              </p>
              <p>
                <span className='text-text-secondary'>Notas: </span>
                {selected.notes ?? '—'}
              </p>
            </div>

            <div className='overflow-hidden rounded-lg border border-border'>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th>Cant.</Th>
                    <Th>Precio</Th>
                    <Th>Desc.</Th>
                    <Th>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.sale_items ?? []).map((item) => (
                    <tr key={item.id}>
                      <Td>{item.products?.name ?? 'Producto'}</Td>
                      <Td>{item.quantity}</Td>
                      <Td>{formatCurrency(item.unit_price)}</Td>
                      <Td>{formatCurrency(item.discount_amount)}</Td>
                      <Td>{formatCurrency(item.line_total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='rounded-lg bg-muted/50 p-3'>
                <p className='flex justify-between'>
                  <span>Subtotal</span>
                  <span>{formatCurrency(selected.subtotal)}</span>
                </p>
                <p className='flex justify-between'>
                  <span>Descuento</span>
                  <span>{formatCurrency(selected.discount_amount)}</span>
                </p>
                <p className='mt-1 flex justify-between border-t border-border pt-1 font-semibold'>
                  <span>Total</span>
                  <span>{formatCurrency(selected.total)}</span>
                </p>
              </div>
              <div className='rounded-lg bg-muted/50 p-3'>
                <p className='mb-1 font-medium'>Pagos</p>
                {(selected.payments ?? []).length === 0 ? (
                  <p className='text-xs text-text-secondary'>Sin pagos</p>
                ) : (
                  (selected.payments ?? []).map((payment) => (
                    <p key={payment.id} className='flex justify-between text-xs'>
                      <span>
                        {PAYMENT_TYPE_LABELS[payment.payment_type] ?? 'Pago'} ·{' '}
                        {PAYMENT_METHOD_LABELS[payment.payment_method]}
                      </span>
                      <span>{formatCurrency(payment.amount)}</span>
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title='Anular venta'
        description='La venta no se elimina: se devuelve el stock y se registra el reembolso.'
        footer={
          <>
            <Button variant='outline' onClick={() => setCancelTarget(null)}>
              Cancelar
            </Button>
            <Button variant='danger' loading={cancelling} onClick={confirmCancel}>
              Anular venta
            </Button>
          </>
        }
      >
        <div className='flex flex-col gap-3'>
          <Field label='Motivo' hint='Obligatorio'>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder='Ej: error de cobro, producto devuelto…'
            />
          </Field>
          <Field label='Método de reembolso' hint='Solo si la venta tiene pagos'>
            <Select
              value={refundMethod}
              onChange={(event) =>
                setRefundMethod(event.target.value as PaymentMethod)
              }
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  )
}
