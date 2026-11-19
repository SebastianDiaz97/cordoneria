import { useState } from 'react'
import { Lock, Plus, Unlock, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useAsync } from '@/hooks/useAsync'
import {
  closeCashRegister,
  getOpenRegister,
  listRegisterMovements,
  listRegisterPayments,
  listRegisters,
  openCashRegister,
  registerCashMovement,
} from '@/services/cash'
import type { CloseRegisterResult, PaymentMethod } from '@/types'
import { PAYMENT_METHODS } from '@/types'
import {
  formatCurrency,
  formatDateTime,
  MOVEMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
} from '@/lib/format'
import { PageHeader, StatCard } from '@/components/ui/Card'
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

type MovementType = 'expense' | 'withdrawal' | 'deposit' | 'other_income'

export default function Caja() {
  const [openModal, setOpenModal] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('0')
  const [movementModal, setMovementModal] = useState(false)
  const [movementType, setMovementType] = useState<MovementType>('expense')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementMethod, setMovementMethod] = useState<PaymentMethod>('cash')
  const [movementDescription, setMovementDescription] = useState('')
  const [closeModal, setCloseModal] = useState(false)
  const [countedCash, setCountedCash] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [closeResult, setCloseResult] = useState<CloseRegisterResult | null>(null)
  const [working, setWorking] = useState(false)

  const { data, loading, error, reload } = useAsync(async () => {
    const register = await getOpenRegister()
    const [payments, movements, registers] = await Promise.all([
      register ? listRegisterPayments(register.id) : Promise.resolve([]),
      register ? listRegisterMovements(register.id) : Promise.resolve([]),
      listRegisters(20),
    ])
    return { register, payments, movements, registers }
  }, [])

  const register = data?.register ?? null
  const payments = data?.payments ?? []
  const movements = data?.movements ?? []

  const net = (payment: (typeof payments)[number]) =>
    payment.payment_type === 'refund'
      ? -Number(payment.amount)
      : Number(payment.amount)
  const cashPayments = payments
    .filter((payment) => payment.payment_method === 'cash')
    .reduce((total, payment) => total + net(payment), 0)
  const cashMovements = movements
    .filter((movement) => movement.payment_method === 'cash')
    .reduce(
      (total, movement) =>
        total +
        (movement.movement_type === 'deposit' ||
        movement.movement_type === 'other_income'
          ? Number(movement.amount)
          : -Number(movement.amount)),
      0,
    )
  const expectedCash = register
    ? Number(register.opening_amount) + cashPayments + cashMovements
    : 0
  const salesIncome = payments
    .filter((payment) => payment.sale_id !== null)
    .reduce((total, payment) => total + net(payment), 0)
  const repairIncome = payments
    .filter((payment) => payment.repair_order_id !== null)
    .reduce((total, payment) => total + net(payment), 0)

  const byMethod = payments.reduce<Record<string, number>>((acc, payment) => {
    acc[payment.payment_method] =
      (acc[payment.payment_method] ?? 0) + net(payment)
    return acc
  }, {})

  async function handleOpen() {
    setWorking(true)
    try {
      await openCashRegister(Number(openingAmount) || 0)
      toast.success('Caja abierta')
      setOpenModal(false)
      setOpeningAmount('0')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo abrir la caja')
    } finally {
      setWorking(false)
    }
  }

  async function handleMovement() {
    if (!movementDescription.trim()) {
      toast.error('Describe el movimiento')
      return
    }
    if (!Number(movementAmount) || Number(movementAmount) <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    setWorking(true)
    try {
      await registerCashMovement({
        movementType,
        amount: Number(movementAmount),
        paymentMethod: movementMethod,
        description: movementDescription.trim(),
      })
      toast.success('Movimiento registrado')
      setMovementModal(false)
      setMovementAmount('')
      setMovementDescription('')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar')
    } finally {
      setWorking(false)
    }
  }

  async function handleClose() {
    if (countedCash === '' || Number(countedCash) < 0) {
      toast.error('Ingresa el efectivo contado')
      return
    }
    setWorking(true)
    try {
      const result = await closeCashRegister(
        Number(countedCash),
        closeNotes.trim() || undefined,
      )
      setCloseResult(result)
      setCloseModal(false)
      setCountedCash('')
      setCloseNotes('')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cerrar la caja')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div>
      <PageHeader
        title='Caja'
        description='Control de efectivo, gastos, retiros y cierre diario'
        actions={
          register ? (
            <>
              <Button variant='outline' onClick={() => setMovementModal(true)}>
                <Plus className='h-4 w-4' /> Movimiento
              </Button>
              <Button variant='danger' onClick={() => setCloseModal(true)}>
                <Lock className='h-4 w-4' /> Cerrar caja
              </Button>
            </>
          ) : (
            <Button onClick={() => setOpenModal(true)}>
              <Unlock className='h-4 w-4' /> Abrir caja
            </Button>
          )
        }
      />

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} onRetry={reload} /> : null}

      {!loading && !error ? (
        register ? (
          <>
            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <StatCard
                label='Estado'
                value='Caja abierta'
                hint={`Desde ${formatDateTime(register.opened_at)}`}
                tone='success'
                icon={<Wallet className='h-5 w-5' />}
              />
              <StatCard
                label='Monto inicial'
                value={formatCurrency(register.opening_amount)}
              />
              <StatCard
                label='Efectivo esperado'
                value={formatCurrency(expectedCash)}
                hint='Inicial + pagos efectivo + movimientos'
                tone='info'
              />
              <StatCard
                label='Cobrado total'
                value={formatCurrency(salesIncome + repairIncome)}
                hint={`Ventas ${formatCurrency(salesIncome)} · Arreglos ${formatCurrency(repairIncome)}`}
                tone='success'
              />
            </div>

            <div className='mt-4 grid gap-4 xl:grid-cols-2'>
              <section className='rounded-xl border border-border bg-surface shadow-soft'>
                <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
                  Ingresos por método de pago
                </h2>
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Método</Th>
                      <Th className='text-right'>Neto</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {PAYMENT_METHODS.map((method) => (
                      <tr key={method}>
                        <Td>{PAYMENT_METHOD_LABELS[method]}</Td>
                        <Td className='text-right font-medium'>
                          {formatCurrency(byMethod[method] ?? 0)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
                <p className='border-t border-border px-4 py-2 text-xs text-text-secondary'>
                  Los pagos de ventas y arreglos ya están incluidos aquí. No
                  registres esos ingresos nuevamente como movimiento manual.
                </p>
              </section>

              <section className='rounded-xl border border-border bg-surface shadow-soft'>
                <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
                  Movimientos de caja
                </h2>
                {movements.length === 0 ? (
                  <EmptyState
                    title='Sin movimientos'
                    description='Registra gastos, retiros o depósitos.'
                  />
                ) : (
                  <TableWrap>
                    <thead>
                      <tr>
                        <Th>Fecha</Th>
                        <Th>Tipo</Th>
                        <Th>Descripción</Th>
                        <Th>Método</Th>
                        <Th className='text-right'>Monto</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement) => {
                        const positive =
                          movement.movement_type === 'deposit' ||
                          movement.movement_type === 'other_income'
                        return (
                          <tr key={movement.id}>
                            <Td>{formatDateTime(movement.moved_at)}</Td>
                            <Td>
                              {MOVEMENT_TYPE_LABELS[movement.movement_type] ??
                                movement.movement_type}
                            </Td>
                            <Td className='max-w-48 truncate'>
                              {movement.description}
                            </Td>
                            <Td>{PAYMENT_METHOD_LABELS[movement.payment_method]}</Td>
                            <Td
                              className={`text-right font-medium ${
                                positive ? 'text-success' : 'text-danger'
                              }`}
                            >
                              {positive ? '+' : '-'}
                              {formatCurrency(movement.amount)}
                            </Td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </TableWrap>
                )}
              </section>
            </div>

            <section className='mt-4 rounded-xl border border-border bg-surface shadow-soft'>
              <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
                Pagos de esta caja ({payments.length})
              </h2>
              {payments.length === 0 ? (
                <EmptyState title='Sin pagos en esta caja' />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Fecha</Th>
                      <Th>Tipo</Th>
                      <Th>Método</Th>
                      <Th>Referencia</Th>
                      <Th className='text-right'>Monto</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <Td>{formatDateTime(payment.paid_at)}</Td>
                        <Td>
                          {PAYMENT_TYPE_LABELS[payment.payment_type] ?? 'Pago'}
                        </Td>
                        <Td>{PAYMENT_METHOD_LABELS[payment.payment_method]}</Td>
                        <Td>{payment.reference_number ?? '—'}</Td>
                        <Td className='text-right font-medium'>
                          {payment.payment_type === 'refund' ? '-' : ''}
                          {formatCurrency(payment.amount)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </section>
          </>
        ) : (
          <div className='rounded-xl border border-border bg-surface p-8 text-center shadow-soft'>
            <Wallet className='mx-auto h-10 w-10 text-text-secondary/60' />
            <h2 className='mt-3 text-lg font-semibold'>No hay caja abierta</h2>
            <p className='mt-1 text-sm text-text-secondary'>
              Abre la caja con el monto inicial en efectivo para comenzar a
              registrar ventas, arreglos y movimientos del día.
            </p>
            <Button className='mt-4' onClick={() => setOpenModal(true)}>
              <Unlock className='h-4 w-4' /> Abrir caja
            </Button>
          </div>
        )
      ) : null}

      <section className='mt-4 rounded-xl border border-border bg-surface shadow-soft'>
        <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
          Historial de cajas
        </h2>
        {(data?.registers ?? []).length === 0 ? (
          <EmptyState title='Sin cajas registradas' />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Apertura</Th>
                <Th>Cierre</Th>
                <Th>Inicial</Th>
                <Th>Contado</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {(data?.registers ?? []).map((item) => (
                <tr key={item.id}>
                  <Td>{formatDateTime(item.opened_at)}</Td>
                  <Td>{formatDateTime(item.closed_at)}</Td>
                  <Td>{formatCurrency(item.opening_amount)}</Td>
                  <Td>
                    {item.closing_amount != null
                      ? formatCurrency(item.closing_amount)
                      : '—'}
                  </Td>
                  <Td>{item.status === 'open' ? 'Abierta' : 'Cerrada'}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title='Abrir caja'
        footer={
          <>
            <Button variant='outline' onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button loading={working} onClick={handleOpen}>
              Abrir caja
            </Button>
          </>
        }
      >
        <Field label='Monto inicial en efectivo'>
          <Input
            type='number'
            min={0}
            value={openingAmount}
            onChange={(event) => setOpeningAmount(event.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={movementModal}
        onClose={() => setMovementModal(false)}
        title='Registrar movimiento'
        description='Solo gastos, retiros, depósitos u otros ingresos manuales.'
        footer={
          <>
            <Button variant='outline' onClick={() => setMovementModal(false)}>
              Cancelar
            </Button>
            <Button loading={working} onClick={handleMovement}>
              Registrar
            </Button>
          </>
        }
      >
        <div className='flex flex-col gap-3'>
          <Field label='Tipo'>
            <Select
              value={movementType}
              onChange={(event) =>
                setMovementType(event.target.value as MovementType)
              }
            >
              <option value='expense'>Gasto</option>
              <option value='withdrawal'>Retiro</option>
              <option value='deposit'>Depósito</option>
              <option value='other_income'>Otro ingreso</option>
            </Select>
          </Field>
          <Field label='Monto'>
            <Input
              type='number'
              min={0}
              value={movementAmount}
              onChange={(event) => setMovementAmount(event.target.value)}
            />
          </Field>
          <Field label='Método'>
            <Select
              value={movementMethod}
              onChange={(event) =>
                setMovementMethod(event.target.value as PaymentMethod)
              }
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label='Descripción' hint='Obligatoria'>
            <Input
              value={movementDescription}
              onChange={(event) => setMovementDescription(event.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={closeModal}
        onClose={() => setCloseModal(false)}
        title='Cerrar caja'
        description={`Efectivo esperado: ${formatCurrency(expectedCash)}`}
        footer={
          <>
            <Button variant='outline' onClick={() => setCloseModal(false)}>
              Cancelar
            </Button>
            <Button variant='danger' loading={working} onClick={handleClose}>
              Cerrar caja
            </Button>
          </>
        }
      >
        <div className='flex flex-col gap-3'>
          <Field label='Efectivo contado'>
            <Input
              type='number'
              min={0}
              value={countedCash}
              onChange={(event) => setCountedCash(event.target.value)}
            />
          </Field>
          <Field label='Notas del cierre'>
            <Textarea
              value={closeNotes}
              onChange={(event) => setCloseNotes(event.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={closeResult !== null}
        onClose={() => setCloseResult(null)}
        title='Resumen de cierre'
        footer={
          <Button onClick={() => setCloseResult(null)}>Entendido</Button>
        }
      >
        {closeResult ? (
          <div className='flex flex-col gap-2 text-sm'>
            <p className='flex justify-between'>
              <span>Monto inicial</span>
              <span>{formatCurrency(closeResult.opening_amount)}</span>
            </p>
            <p className='flex justify-between'>
              <span>Efectivo esperado</span>
              <span>{formatCurrency(closeResult.expected_cash)}</span>
            </p>
            <p className='flex justify-between'>
              <span>Efectivo contado</span>
              <span>{formatCurrency(closeResult.counted_cash)}</span>
            </p>
            <p
              className={`flex justify-between border-t border-border pt-1 font-semibold ${
                Number(closeResult.difference) === 0
                  ? 'text-success'
                  : 'text-danger'
              }`}
            >
              <span>Diferencia</span>
              <span>{formatCurrency(closeResult.difference)}</span>
            </p>
            <div className='mt-2 rounded-lg bg-muted/50 p-3'>
              <p className='text-xs font-medium uppercase text-text-secondary'>
                Pagos por método
              </p>
              {Object.entries(closeResult.payments_by_method ?? {}).map(
                ([method, total]) => (
                  <p key={method} className='flex justify-between text-xs'>
                    <span>{PAYMENT_METHOD_LABELS[method] ?? method}</span>
                    <span>{formatCurrency(total)}</span>
                  </p>
                ),
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
