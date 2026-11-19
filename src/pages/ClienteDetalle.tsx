import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAsync } from '@/hooks/useAsync'
import {
  addCustomerNote,
  getCustomer,
  getCustomerHistory,
} from '@/services/customers'
import { getGarmentBalance } from '@/services/repairs'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  GARMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  whatsappLink,
} from '@/lib/format'
import { PageHeader, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { statusTone } from '@/lib/statusTone'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { ErrorBlock, LoadingBlock, TableWrap, Td, Th } from '@/components/ui/States'

export default function ClienteDetalle() {
  const { customerId = '' } = useParams()
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const { data, loading, error, reload } = useAsync(async () => {
    const [customer, history] = await Promise.all([
      getCustomer(customerId),
      getCustomerHistory(customerId),
    ])
    const garments = history.orders.flatMap(
      (order) => order.repair_garments ?? [],
    )
    const activeGarments = garments.filter(
      (garment) =>
        garment.status !== 'delivered' && garment.status !== 'cancelled',
    )
    const entries = await Promise.all(
      activeGarments.map(
        async (garment) =>
          [garment.id, await getGarmentBalance(garment.id)] as const,
      ),
    )
    return { customer, history, garments, balances: Object.fromEntries(entries) }
  }, [customerId])

  async function submitNote() {
    if (!note.trim()) return
    setSavingNote(true)
    try {
      await addCustomerNote(customerId, note.trim())
      setNote('')
      toast.success('Nota agregada')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) return <LoadingBlock label='Cargando cliente…' />
  if (error) return <ErrorBlock message={error} onRetry={reload} />
  if (!data) return null

  const { customer, history, garments, balances } = data
  const salesTotal = history.sales
    .filter((sale) => sale.status === 'completed')
    .reduce((total, sale) => total + Number(sale.total), 0)
  const repairTotal = history.orders.reduce(
    (total, order) => total + Number(order.total),
    0,
  )
  const pending = Object.values(balances).reduce(
    (total, balance) => total + Number(balance),
    0,
  )
  const link = whatsappLink(
    customer.whatsapp ?? customer.phone,
    `Hola ${customer.full_name}, te contactamos de Cordonería.`,
  )

  return (
    <div>
      <Link
        to='/clientes'
        className='mb-2 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary'
      >
        <ArrowLeft className='h-4 w-4' /> Volver a clientes
      </Link>

      <PageHeader
        title={customer.full_name}
        description={`Cliente desde ${formatDate(customer.created_at)}`}
        actions={
          link ? (
            <a href={link} target='_blank' rel='noreferrer'>
              <Button variant='outline'>
                <MessageCircle className='h-4 w-4 text-success' /> WhatsApp
              </Button>
            </a>
          ) : null
        }
      />

      <div className='mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='Ventas' value={formatCurrency(salesTotal)} />
        <StatCard label='Arreglos' value={formatCurrency(repairTotal)} />
        <StatCard
          label='Saldo pendiente'
          value={formatCurrency(pending)}
          tone={pending > 0 ? 'warning' : 'success'}
        />
        <div className='rounded-xl border border-border bg-surface p-4 text-sm shadow-soft'>
          <p className='text-xs uppercase tracking-wide text-text-secondary'>
            Contacto
          </p>
          <p className='mt-1'>{customer.phone ?? 'Sin teléfono'}</p>
          <p className='text-xs text-text-secondary'>
            {customer.whatsapp ? `WhatsApp ${customer.whatsapp}` : ''}
          </p>
          <p className='text-xs text-text-secondary'>{customer.email ?? ''}</p>
        </div>
      </div>

      {customer.notes ? (
        <div className='mb-4 rounded-xl border border-border bg-surface p-4 text-sm shadow-soft'>
          <p className='text-xs uppercase text-text-secondary'>Notas del cliente</p>
          <p className='mt-1 whitespace-pre-line'>{customer.notes}</p>
        </div>
      ) : null}

      <div className='grid gap-4 xl:grid-cols-2'>
        <section className='rounded-xl border border-border bg-surface shadow-soft'>
          <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
            Ventas ({history.sales.length})
          </h2>
          {history.sales.length === 0 ? (
            <p className='p-4 text-sm text-text-secondary'>Sin ventas registradas.</p>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>N°</Th>
                  <Th>Fecha</Th>
                  <Th>Total</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {history.sales.map((sale) => (
                  <tr key={sale.id}>
                    <Td>#{sale.sale_number}</Td>
                    <Td>{formatDate(sale.sold_at)}</Td>
                    <Td>{formatCurrency(sale.total)}</Td>
                    <Td>
                      <Badge
                        tone={sale.status === 'completed' ? 'success' : 'danger'}
                      >
                        {sale.status === 'completed' ? 'Completada' : 'Anulada'}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </section>

        <section className='rounded-xl border border-border bg-surface shadow-soft'>
          <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
            Órdenes de arreglo ({history.orders.length})
          </h2>
          {history.orders.length === 0 ? (
            <p className='p-4 text-sm text-text-secondary'>Sin arreglos registrados.</p>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>N°</Th>
                  <Th>Fecha</Th>
                  <Th>Prendas</Th>
                  <Th>Total</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {history.orders.map((order) => (
                  <tr key={order.id}>
                    <Td>
                      <Link
                        to={`/arreglos/${order.id}`}
                        className='font-medium text-primary hover:underline'
                      >
                        #{order.order_number}
                      </Link>
                    </Td>
                    <Td>{formatDate(order.received_at)}</Td>
                    <Td>{order.repair_garments?.length ?? 0}</Td>
                    <Td>{formatCurrency(order.total)}</Td>
                    <Td>
                      <Badge tone={statusTone(order.status)}>
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </section>

        <section className='rounded-xl border border-border bg-surface shadow-soft'>
          <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
            Prendas pendientes
          </h2>
          {garments.filter(
            (garment) =>
              garment.status !== 'delivered' && garment.status !== 'cancelled',
          ).length === 0 ? (
            <p className='p-4 text-sm text-text-secondary'>Sin prendas pendientes.</p>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Prenda</Th>
                  <Th>Estado</Th>
                  <Th>Precio</Th>
                  <Th>Saldo</Th>
                </tr>
              </thead>
              <tbody>
                {garments
                  .filter(
                    (garment) =>
                      garment.status !== 'delivered' &&
                      garment.status !== 'cancelled',
                  )
                  .map((garment) => (
                    <tr key={garment.id}>
                      <Td>
                        {garment.garment_type}
                        {garment.color ? ` · ${garment.color}` : ''}
                      </Td>
                      <Td>
                        <Badge tone={statusTone(garment.status)}>
                          {GARMENT_STATUS_LABELS[garment.status] ?? garment.status}
                        </Badge>
                      </Td>
                      <Td>{formatCurrency(garment.service_price)}</Td>
                      <Td className='font-medium'>
                        {formatCurrency(balances[garment.id] ?? 0)}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </TableWrap>
          )}
        </section>

        <section className='rounded-xl border border-border bg-surface shadow-soft'>
          <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
            Pagos y abonos ({history.payments.length})
          </h2>
          {history.payments.length === 0 ? (
            <p className='p-4 text-sm text-text-secondary'>Sin pagos registrados.</p>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Tipo</Th>
                  <Th>Método</Th>
                  <Th>Monto</Th>
                </tr>
              </thead>
              <tbody>
                {history.payments.map((payment) => (
                  <tr key={payment.id}>
                    <Td>{formatDate(payment.paid_at)}</Td>
                    <Td>{PAYMENT_TYPE_LABELS[payment.payment_type] ?? 'Pago'}</Td>
                    <Td>{PAYMENT_METHOD_LABELS[payment.payment_method]}</Td>
                    <Td
                      className={
                        payment.payment_type === 'refund' ? 'text-danger' : ''
                      }
                    >
                      {payment.payment_type === 'refund' ? '-' : ''}
                      {formatCurrency(payment.amount)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </section>
      </div>

      <section className='mt-4 rounded-xl border border-border bg-surface shadow-soft'>
        <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
          Notas del historial ({history.notes.length})
        </h2>
        <div className='p-4'>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <Textarea
              className='min-h-10 flex-1'
              placeholder='Agregar una nota al historial del cliente…'
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button
              className='self-end'
              loading={savingNote}
              disabled={!note.trim()}
              onClick={submitNote}
            >
              <Plus className='h-4 w-4' /> Agregar nota
            </Button>
          </div>
          {history.notes.length === 0 ? (
            <p className='mt-3 text-sm text-text-secondary'>Sin notas registradas.</p>
          ) : (
            <ul className='mt-3 divide-y divide-border'>
              {history.notes.map((item) => (
                <li key={item.id} className='py-2 text-sm'>
                  <p>{item.note}</p>
                  <p className='text-xs text-text-secondary'>
                    {formatDateTime(item.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
