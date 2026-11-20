import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, PackageCheck, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { listProducts, listServiceCatalog } from '@/services/catalog'
import {
  addRepairMaterial,
  cancelGarment,
  deliverGarment,
  getRepairOrder,
  getStoragePreview,
  logGarmentNotification,
  registerGarmentPayment,
  setGarmentServices,
  setGarmentStatus,
  voidRepairMaterial,
} from '@/services/repairs'
import type {
  GarmentStatus,
  PaymentMethod,
  Payment,
  RepairGarment,
  RepairMaterial,
  ServiceCatalogItem,
} from '@/types'
import { PAYMENT_METHODS } from '@/types'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  GARMENT_STATUS_LABELS,
  NOTIFICATION_METHOD_LABELS,
  NOTIFICATION_RESULT_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  parseDecimal,
  sanitizeQuantity,
  unitAllowsDecimals,
} from '@/lib/format'
import { appliedTenderAmounts, summarizeTender } from '@/lib/payments'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { statusTone } from '@/lib/statusTone'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ErrorBlock, LoadingBlock } from '@/components/ui/States'
import { GarmentCard } from '@/features/repairs/GarmentCard'

interface ServiceDraft {
  key: string
  serviceId: string
  description: string
  quantity: string
  unitPrice: string
}

interface PaymentDraft {
  key: string
  method: PaymentMethod
  amount: string
  reference: string
}

function newPaymentDraft(): PaymentDraft {
  return {
    key: crypto.randomUUID(),
    method: 'cash',
    amount: '',
    reference: '',
  }
}

function PaymentDraftsEditor({
  drafts,
  setDrafts,
  due,
}: {
  drafts: PaymentDraft[]
  setDrafts: (updater: (current: PaymentDraft[]) => PaymentDraft[]) => void
  due: number
}) {
  const summary = summarizeTender(
    drafts.map((payment) => ({
      method: payment.method,
      amount: Number(payment.amount) || 0,
    })),
    due,
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-medium">Pagos</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setDrafts((current) => [...current, newPaymentDraft()])
          }
        >
          <Plus className="h-3.5 w-3.5" /> Método
        </Button>
      </div>
      {drafts.map((payment) => (
        <div key={payment.key} className="flex flex-wrap items-end gap-2">
          <Field label="Método" className="w-32">
            <Select
              value={payment.method}
              onChange={(event) =>
                setDrafts((current) =>
                  current.map((item) =>
                    item.key === payment.key
                      ? {
                          ...item,
                          method: event.target.value as PaymentMethod,
                        }
                      : item,
                  ),
                )
              }
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Monto" className="w-28">
            <Input
              type="number"
              min={0}
              value={payment.amount}
              onChange={(event) =>
                setDrafts((current) =>
                  current.map((item) =>
                    item.key === payment.key
                      ? { ...item, amount: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </Field>
          <Field label="Referencia" className="min-w-28 flex-1">
            <Input
              value={payment.reference}
              onChange={(event) =>
                setDrafts((current) =>
                  current.map((item) =>
                    item.key === payment.key
                      ? { ...item, reference: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </Field>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setDrafts((current) =>
                current.map((item) =>
                  item.key === payment.key
                    ? {
                        ...item,
                        amount: String(
                          due - summary.tendered + (Number(item.amount) || 0),
                        ),
                      }
                    : item,
                ),
              )
            }
          >
            Restante
          </Button>
          {drafts.length > 1 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setDrafts((current) =>
                  current.filter((item) => item.key !== payment.key),
                )
              }
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          ) : null}
        </div>
      ))}
      {summary.nonCashExcess > 0 ? (
        <p className="text-xs text-danger">
          El pago con métodos distintos de efectivo no puede superar el saldo.
        </p>
      ) : null}
      <p
        className={
          summary.valid ? 'text-xs text-success' : 'text-xs text-danger'
        }
      >
        Recibido {formatCurrency(summary.tendered)} de {formatCurrency(due)}
      </p>
      {summary.change > 0 ? (
        <p className="text-xs font-medium text-success">
          Vuelto: {formatCurrency(summary.change)}
        </p>
      ) : null}
    </div>
  )
}

export default function ArregloDetalle() {
  const { orderId = '' } = useParams()
  const { isAdmin } = useAuth()
  const { data, loading, error, reload } = useAsync(
    () => getRepairOrder(orderId),
    [orderId],
  )

  const productsQuery = useAsync(() => listProducts(), [])
  const servicesQuery = useAsync(() => listServiceCatalog(), [])

  const [paymentTarget, setPaymentTarget] = useState<RepairGarment | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentReference, setPaymentReference] = useState('')

  const [materialTarget, setMaterialTarget] = useState<RepairGarment | null>(
    null,
  )
  const [materialProduct, setMaterialProduct] = useState('')
  const [materialQuantity, setMaterialQuantity] = useState('1')
  const [materialNotes, setMaterialNotes] = useState('')

  const [servicesTarget, setServicesTarget] = useState<RepairGarment | null>(
    null,
  )
  const [serviceDrafts, setServiceDrafts] = useState<ServiceDraft[]>([])

  const [deliverTarget, setDeliverTarget] = useState<RepairGarment | null>(null)
  const [deliverPayments, setDeliverPayments] = useState<PaymentDraft[]>([
    newPaymentDraft(),
  ])
  const [waiveFee, setWaiveFee] = useState(false)
  const [storagePreview, setStoragePreview] = useState<{
    daysOver: number
    fee: number
  } | null>(null)
  const [delivering, setDelivering] = useState(false)

  const [bulkDeliverOpen, setBulkDeliverOpen] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [bulkPreviews, setBulkPreviews] = useState<
    Record<string, { daysOver: number; fee: number }>
  >({})
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkPayments, setBulkPayments] = useState<PaymentDraft[]>([
    newPaymentDraft(),
  ])
  const [bulkWaiveFee, setBulkWaiveFee] = useState(false)
  const [bulkDelivering, setBulkDelivering] = useState(false)

  const [cancelTarget, setCancelTarget] = useState<RepairGarment | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('cash')

  const [notifyTarget, setNotifyTarget] = useState<RepairGarment | null>(null)
  const [notifyMethod, setNotifyMethod] = useState<
    'whatsapp' | 'phone_call' | 'in_person' | 'other'
  >('whatsapp')
  const [notifyResult, setNotifyResult] = useState('contacted')
  const [notifyNotes, setNotifyNotes] = useState('')

  const [voidTarget, setVoidTarget] = useState<RepairMaterial | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const [working, setWorking] = useState(false)

  const products = productsQuery.data ?? []
  const catalog = servicesQuery.data ?? []
  const materialUnit = products.find(
    (product) => product.id === materialProduct,
  )?.unit

  const paymentsByGarment = useMemo(() => {
    const map = new Map<string, Payment[]>()
    if (!data) return map
    for (const payment of data.payments) {
      if (!payment.garment_id) continue
      const list = map.get(payment.garment_id) ?? []
      list.push(payment)
      map.set(payment.garment_id, list)
    }
    return map
  }, [data])

  useEffect(() => {
    if (!deliverTarget) return
    let active = true
    getStoragePreview(deliverTarget)
      .then((preview) => {
        if (active) setStoragePreview(preview)
      })
      .catch((err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : 'Error al calcular guarda',
        ),
      )
    return () => {
      active = false
    }
  }, [deliverTarget])

  if (loading) return <LoadingBlock label="Cargando orden…" />
  if (error) return <ErrorBlock message={error} onRetry={reload} />
  if (!data) return null

  const { order, garments } = data
  const paidFor = (garmentId: string) =>
    (data.payments ?? [])
      .filter((payment) => payment.garment_id === garmentId)
      .reduce(
        (total, payment) =>
          total +
          (payment.payment_type === 'refund'
            ? -Number(payment.amount)
            : Number(payment.amount)),
        0,
      )

  async function changeStatus(garment: RepairGarment, status: GarmentStatus) {
    try {
      await setGarmentStatus(garment.id, status)
      toast.success('Estado actualizado')
      reload()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo cambiar el estado',
      )
    }
  }

  function openPayment(garment: RepairGarment) {
    setPaymentTarget(garment)
    setPaymentAmount(String(data?.balances[garment.id] ?? ''))
    setPaymentMethod('cash')
    setPaymentReference('')
  }

  async function submitPayment() {
    if (!paymentTarget) return
    const amount = Number(paymentAmount)
    const balance = data?.balances[paymentTarget.id] ?? 0
    if (!amount || amount <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (paymentMethod !== 'cash' && amount > balance) {
      toast.error(`El monto supera el saldo (${formatCurrency(balance)})`)
      return
    }
    setWorking(true)
    try {
      await registerGarmentPayment(paymentTarget.id, {
        amount: paymentMethod === 'cash' ? Math.min(amount, balance) : amount,
        payment_method: paymentMethod,
        reference_number: paymentReference.trim() || null,
      })
      toast.success('Pago registrado')
      setPaymentTarget(null)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar')
    } finally {
      setWorking(false)
    }
  }

  async function submitMaterial() {
    if (!materialTarget || !materialProduct) {
      toast.error('Selecciona un producto')
      return
    }
    setWorking(true)
    try {
      await addRepairMaterial({
        garmentId: materialTarget.id,
        productId: materialProduct,
        quantity: parseDecimal(materialQuantity),
        notes: materialNotes.trim() || null,
      })
      toast.success('Material registrado y stock descontado')
      setMaterialTarget(null)
      setMaterialProduct('')
      setMaterialQuantity('1')
      setMaterialNotes('')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar')
    } finally {
      setWorking(false)
    }
  }

  function openServices(garment: RepairGarment) {
    setServicesTarget(garment)
    setServiceDrafts(
      (garment.repair_garment_services ?? []).map((service) => ({
        key: crypto.randomUUID(),
        serviceId: service.service_id ?? '',
        description: service.description,
        quantity: String(service.quantity),
        unitPrice: String(service.unit_price),
      })),
    )
  }

  async function submitServices() {
    if (!servicesTarget) return
    const valid = serviceDrafts.filter(
      (draft) =>
        (draft.serviceId || draft.description.trim()) &&
        parseDecimal(draft.quantity) > 0,
    )
    if (valid.length === 0) {
      toast.error('Agrega al menos un servicio')
      return
    }
    setWorking(true)
    try {
      await setGarmentServices(
        servicesTarget.id,
        valid.map((draft) => ({
          service_id: draft.serviceId || null,
          description: draft.serviceId ? null : draft.description.trim(),
          quantity: parseDecimal(draft.quantity),
          unit_price: Number(draft.unitPrice) || 0,
        })),
      )
      toast.success('Servicios actualizados')
      setServicesTarget(null)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar')
    } finally {
      setWorking(false)
    }
  }

  function openDeliver(garment: RepairGarment) {
    setStoragePreview(null)
    setDeliverTarget(garment)
    setDeliverPayments([newPaymentDraft()])
    setWaiveFee(false)
  }

  const deliverPaid = deliverTarget ? paidFor(deliverTarget.id) : 0
  const deliverFee =
    deliverTarget && storagePreview ? (waiveFee ? 0 : storagePreview.fee) : 0
  const deliverDue = deliverTarget
    ? Math.max(
        Number(deliverTarget.service_price) - deliverPaid + deliverFee,
        0,
      )
    : 0
  const deliverSummary = summarizeTender(
    deliverPayments.map((payment) => ({
      method: payment.method,
      amount: Number(payment.amount) || 0,
    })),
    deliverDue,
  )

  const readyGarments = garments.filter((garment) => garment.status === 'ready')
  const bulkGarments = readyGarments.filter((garment) =>
    bulkSelected.includes(garment.id),
  )
  const dueFor = (garment: RepairGarment, waive: boolean) =>
    Math.max(
      Number(garment.service_price) -
        paidFor(garment.id) +
        (waive ? 0 : (bulkPreviews[garment.id]?.fee ?? 0)),
      0,
    )
  const bulkDueFor = (garment: RepairGarment) => dueFor(garment, bulkWaiveFee)
  const bulkDue = bulkGarments.reduce(
    (total, garment) => total + bulkDueFor(garment),
    0,
  )
  const bulkSummary = summarizeTender(
    bulkPayments.map((payment) => ({
      method: payment.method,
      amount: Number(payment.amount) || 0,
    })),
    bulkDue,
  )
  const bulkReady =
    !bulkLoading &&
    bulkGarments.length > 0 &&
    bulkGarments.every((garment) => bulkPreviews[garment.id] !== undefined)

  const paymentBalance = paymentTarget
    ? (data.balances[paymentTarget.id] ?? 0)
    : 0
  const paymentTendered = Number(paymentAmount) || 0
  const paymentApplied =
    paymentMethod === 'cash'
      ? Math.min(paymentTendered, paymentBalance)
      : paymentTendered
  const paymentChange =
    paymentMethod === 'cash' ? Math.max(paymentTendered - paymentBalance, 0) : 0

  function adjustBulkPayment(previousDue: number, nextDue: number) {
    setBulkPayments((current) => {
      const first = current[0]
      if (!first || current.length !== 1) return current
      if (Math.abs((Number(first.amount) || 0) - previousDue) >= 0.01) {
        return current
      }
      return [
        {
          ...first,
          amount: nextDue > 0 ? String(nextDue) : '',
        },
      ]
    })
  }

  function toggleBulkGarment(id: string) {
    const previousDue = bulkDue
    const nextSelected = bulkSelected.includes(id)
      ? bulkSelected.filter((item) => item !== id)
      : [...bulkSelected, id]
    const nextDue = readyGarments
      .filter((garment) => nextSelected.includes(garment.id))
      .reduce((total, garment) => total + dueFor(garment, bulkWaiveFee), 0)
    setBulkSelected(nextSelected)
    adjustBulkPayment(previousDue, nextDue)
  }

  function toggleBulkWaive(checked: boolean) {
    const previousDue = bulkDue
    const nextDue = bulkGarments.reduce(
      (total, garment) => total + dueFor(garment, checked),
      0,
    )
    setBulkWaiveFee(checked)
    adjustBulkPayment(previousDue, nextDue)
  }

  async function openBulkDeliver() {
    const ready = garments.filter((garment) => garment.status === 'ready')
    if (ready.length === 0) {
      toast.error('No hay prendas listas para entregar')
      return
    }
    setBulkSelected(ready.map((garment) => garment.id))
    setBulkWaiveFee(false)
    setBulkPayments([newPaymentDraft()])
    setBulkPreviews({})
    setBulkDeliverOpen(true)
    setBulkLoading(true)
    try {
      const entries = await Promise.all(
        ready.map(
          async (garment) =>
            [garment.id, await getStoragePreview(garment)] as const,
        ),
      )
      const previews = Object.fromEntries(entries) as Record<
        string,
        { daysOver: number; fee: number }
      >
      setBulkPreviews(previews)
      const total = ready.reduce(
        (sum, garment) =>
          sum +
          Math.max(
            Number(garment.service_price) -
              paidFor(garment.id) +
              (previews[garment.id]?.fee ?? 0),
            0,
          ),
        0,
      )
      if (total > 0) {
        setBulkPayments([{ ...newPaymentDraft(), amount: String(total) }])
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudieron calcular los saldos',
      )
    } finally {
      setBulkLoading(false)
    }
  }

  async function submitBulkDeliver() {
    if (bulkGarments.length === 0) {
      toast.error('Selecciona al menos una prenda')
      return
    }
    if (!bulkReady) {
      toast.error('Espera a que se calculen los saldos')
      return
    }
    if (!bulkSummary.valid) {
      toast.error(
        bulkSummary.nonCashExcess > 0
          ? 'El pago con métodos distintos de efectivo no puede superar el saldo'
          : `Faltan ${formatCurrency(bulkSummary.missing)} por cobrar`,
      )
      return
    }

    setBulkDelivering(true)
    let delivered = 0
    try {
      const pools = appliedTenderAmounts(
        bulkPayments.map((payment) => ({
          method: payment.method,
          amount: Number(payment.amount) || 0,
          reference: payment.reference.trim() || null,
        })),
        bulkDue,
      ).map((payment) => ({
        method: payment.method,
        reference: payment.reference,
        remaining: payment.amount,
      }))

      for (const garment of bulkGarments) {
        const due = bulkDueFor(garment)
        let remainingDue = due
        const garmentPayments: {
          amount: number
          payment_method: PaymentMethod
          reference_number: string | null
        }[] = []

        for (const pool of pools) {
          if (remainingDue <= 0.001) break
          const amount =
            Math.round(Math.min(remainingDue, pool.remaining) * 100) / 100
          if (amount <= 0) continue
          garmentPayments.push({
            amount,
            payment_method: pool.method,
            reference_number: pool.reference,
          })
          pool.remaining -= amount
          remainingDue -= amount
        }

        if (remainingDue > 0.01) {
          throw new Error('No se pudo repartir el pago entre las prendas')
        }

        const allocated = garmentPayments.reduce(
          (total, payment) => total + payment.amount,
          0,
        )
        const rounding = Math.round((due - allocated) * 100) / 100
        const lastPayment = garmentPayments[garmentPayments.length - 1]
        if (Math.abs(rounding) > 0.001 && lastPayment) {
          lastPayment.amount += rounding
        }

        await deliverGarment({
          garmentId: garment.id,
          waiveStorageFee: bulkWaiveFee,
          payments: garmentPayments,
        })
        delivered += 1
      }

      toast.success(
        delivered === 1
          ? 'Prenda entregada correctamente'
          : `${delivered} prendas entregadas correctamente`,
      )
      setBulkDeliverOpen(false)
      reload()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo completar la entrega'
      toast.error(
        delivered > 0
          ? `Se entregaron ${delivered} de ${bulkGarments.length}. ${message}`
          : message,
      )
      if (delivered > 0) setBulkDeliverOpen(false)
      reload()
    } finally {
      setBulkDelivering(false)
    }
  }

  async function submitDeliver() {
    if (!deliverTarget) return
    if (!deliverSummary.valid) {
      toast.error(
        deliverSummary.nonCashExcess > 0
          ? 'El pago con métodos distintos de efectivo no puede superar el saldo'
          : `Faltan ${formatCurrency(deliverSummary.missing)} por cobrar`,
      )
      return
    }
    setDelivering(true)
    try {
      await deliverGarment({
        garmentId: deliverTarget.id,
        waiveStorageFee: waiveFee,
        payments: appliedTenderAmounts(
          deliverPayments.map((payment) => ({
            method: payment.method,
            amount: Number(payment.amount) || 0,
            reference: payment.reference.trim() || null,
          })),
          deliverDue,
        ).map((payment) => ({
          amount: payment.amount,
          payment_method: payment.method,
          reference_number: payment.reference,
        })),
      })
      toast.success('Prenda entregada correctamente')
      setDeliverTarget(null)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo entregar')
    } finally {
      setDelivering(false)
    }
  }

  async function submitCancel() {
    if (!cancelTarget) return
    if (!cancelReason.trim()) {
      toast.error('Indica el motivo de la cancelación')
      return
    }
    setWorking(true)
    try {
      const paid = paidFor(cancelTarget.id)
      await cancelGarment(
        cancelTarget.id,
        cancelReason.trim(),
        paid > 0 ? refundMethod : null,
      )
      toast.success('Prenda cancelada')
      setCancelTarget(null)
      setCancelReason('')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar')
    } finally {
      setWorking(false)
    }
  }

  async function submitNotify() {
    if (!notifyTarget) return
    setWorking(true)
    try {
      await logGarmentNotification({
        garmentId: notifyTarget.id,
        method: notifyMethod,
        result: notifyResult,
        notes: notifyNotes.trim() || null,
      })
      toast.success('Aviso registrado')
      setNotifyTarget(null)
      setNotifyNotes('')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar')
    } finally {
      setWorking(false)
    }
  }

  async function submitVoid() {
    if (!voidTarget) return
    if (!voidReason.trim()) {
      toast.error('Indica el motivo')
      return
    }
    setWorking(true)
    try {
      await voidRepairMaterial(voidTarget.id, voidReason.trim())
      toast.success('Material anulado y stock devuelto')
      setVoidTarget(null)
      setVoidReason('')
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo anular')
    } finally {
      setWorking(false)
    }
  }

  let paid = 0
  garments.map((garment) => {
    // console.log(paymentsByGarment.get(garment.id)?.[0]?.amount)
    paid = paid + (paymentsByGarment.get(garment.id)?.[0]?.amount ?? 0)
    // console.log(paid);
  })

  return (
    <div>
      <Link
        to="/arreglos"
        className="mb-2 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a arreglos
      </Link>

      <PageHeader
        title={`Orden #${order.order_number}`}
        description={`${order.customers?.full_name ?? 'Cliente'} · recibida ${formatDate(order.received_at)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {readyGarments.length >= 2 ? (
              <Button size="sm" onClick={openBulkDeliver}>
                <PackageCheck className="h-4 w-4" /> Entrega conjunta
              </Button>
            ) : null}
            <Badge tone={statusTone(order.status)}>
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </Badge>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-surface p-3 text-sm shadow-soft">
          <p className="text-xs uppercase text-text-secondary">Cliente</p>
          <p className="mt-1 font-medium">
            {order.customers?.full_name ?? '—'}
          </p>
          <p className="text-xs text-text-secondary">
            {order.customers?.phone ??
              order.customers?.whatsapp ??
              'Sin teléfono'}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-sm shadow-soft">
          <p className="text-xs uppercase text-text-secondary">Prendas</p>
          <p className="mt-1 font-medium">{garments.length}</p>
          <p className="text-xs text-text-secondary">
            {garments.filter((garment) => garment.status === 'ready').length}{' '}
            listas
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-sm shadow-soft">
          <p className="text-xs uppercase text-text-secondary">Total orden</p>
          <p className="mt-1 font-medium">{formatCurrency(order.total)}</p>
          <p className="text-xs text-text-secondary">
            Servicios {formatCurrency(order.subtotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-sm shadow-soft">
          <p className="text-xs uppercase text-text-secondary">abono</p>
          <p className="mt-1 font-medium">{formatCurrency(paid)}</p>

          <p className="text-xs text-text-secondary">
            Por Pagar {formatCurrency(order.subtotal-paid)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-sm shadow-soft">
          <p className="text-xs uppercase text-text-secondary">Notas</p>
          <p className="mt-1 line-clamp-2 text-xs">
            {order.notes ?? 'Sin notas'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {garments.map((garment) => (
          <GarmentCard
            key={garment.id}
            garment={garment}
            payments={paymentsByGarment.get(garment.id) ?? []}
            history={data.history.filter(
              (entry) => entry.garment_id === garment.id,
            )}
            notifications={data.notifications.filter(
              (entry) => entry.garment_id === garment.id,
            )}
            balance={data.balances[garment.id] ?? 0}
            isAdmin={isAdmin}
            onStatus={(status) => changeStatus(garment, status)}
            onDeliver={() => openDeliver(garment)}
            onCancel={() => {
              setCancelTarget(garment)
              setCancelReason('')
              setRefundMethod('cash')
            }}
            onAddPayment={() => openPayment(garment)}
            onAddMaterial={() => {
              setMaterialTarget(garment)
              setMaterialProduct('')
              setMaterialQuantity('1')
              setMaterialNotes('')
            }}
            onEditServices={() => openServices(garment)}
            onNotify={() => {
              setNotifyTarget(garment)
              setNotifyMethod('whatsapp')
              setNotifyResult('contacted')
              setNotifyNotes('')
            }}
            onVoidMaterial={(material) => {
              setVoidTarget(material)
              setVoidReason('')
            }}
          />
        ))}
      </div>

      {data.photos.length > 0 ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm shadow-soft">
          <p className="font-medium">Fotografías registradas</p>
          <ul className="mt-2 list-disc pl-5 text-xs text-text-secondary">
            {data.photos.map((photo) => (
              <li key={photo.id}>
                {photo.caption ?? photo.storage_path} ·{' '}
                {formatDateTime(photo.created_at)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-text-secondary">
            Las imágenes se almacenan en Supabase Storage; se requiere un bucket
            configurado para visualizarlas.
          </p>
        </div>
      ) : null}

      <Modal
        open={paymentTarget !== null}
        onClose={() => setPaymentTarget(null)}
        title="Registrar pago"
        description={
          paymentTarget
            ? `Prenda ${paymentTarget.garment_number} · saldo ${formatCurrency(data.balances[paymentTarget.id] ?? 0)}`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setPaymentTarget(null)}>
              Cancelar
            </Button>
            <Button loading={working} onClick={submitPayment}>
              Registrar pago
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Monto">
            <Input
              type="number"
              min={0}
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
          </Field>
          <Field label="Método">
            <Select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as PaymentMethod)
              }
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Referencia">
            <Input
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              placeholder="Opcional"
            />
          </Field>
          {paymentMethod === 'cash' && paymentChange > 0 ? (
            <p className="text-xs font-medium text-success">
              Se registrará un pago de {formatCurrency(paymentApplied)} · Vuelto{' '}
              {formatCurrency(paymentChange)}
            </p>
          ) : null}
          {paymentMethod !== 'cash' && paymentTendered > paymentBalance ? (
            <p className="text-xs text-danger">
              El monto supera el saldo ({formatCurrency(paymentBalance)}).
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={materialTarget !== null}
        onClose={() => setMaterialTarget(null)}
        title="Agregar material"
        description="Se descuenta automáticamente del inventario."
        footer={
          <>
            <Button variant="outline" onClick={() => setMaterialTarget(null)}>
              Cancelar
            </Button>
            <Button loading={working} onClick={submitMaterial}>
              Agregar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Producto">
            <Select
              value={materialProduct}
              onChange={(event) => {
                const selected = products.find(
                  (product) => product.id === event.target.value,
                )
                setMaterialProduct(event.target.value)
                setMaterialQuantity((current) =>
                  sanitizeQuantity(current, unitAllowsDecimals(selected?.unit)),
                )
              }}
            >
              <option value="">Seleccionar…</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · stock{' '}
                  {formatNumber(product.current_stock, 2)} {product.unit}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cantidad">
            <Input
              type="text"
              inputMode={
                unitAllowsDecimals(materialUnit) ? 'decimal' : 'numeric'
              }
              value={materialQuantity}
              onChange={(event) =>
                setMaterialQuantity(
                  sanitizeQuantity(
                    event.target.value,
                    unitAllowsDecimals(materialUnit),
                  ),
                )
              }
            />
          </Field>
          <Field label="Notas">
            <Input
              value={materialNotes}
              onChange={(event) => setMaterialNotes(event.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={servicesTarget !== null}
        onClose={() => setServicesTarget(null)}
        title="Editar servicios"
        description="El precio de la prenda se recalcula automáticamente."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setServicesTarget(null)}>
              Cancelar
            </Button>
            <Button loading={working} onClick={submitServices}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          {serviceDrafts.map((draft) => (
            <div
              key={draft.key}
              className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
            >
              <Field label="Catálogo">
                <Select
                  value={draft.serviceId}
                  onChange={(event) => {
                    const selected: ServiceCatalogItem | undefined =
                      catalog.find((item) => item.id === event.target.value)
                    setServiceDrafts((current) =>
                      current.map((item) =>
                        item.key === draft.key
                          ? {
                              ...item,
                              serviceId: event.target.value,
                              description: selected?.name ?? item.description,
                              unitPrice: selected
                                ? String(selected.default_price)
                                : item.unitPrice,
                            }
                          : item,
                      ),
                    )
                  }}
                >
                  <option value="">Personalizado</option>
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Descripción">
                <Input
                  value={draft.description}
                  disabled={Boolean(draft.serviceId)}
                  onChange={(event) =>
                    setServiceDrafts((current) =>
                      current.map((item) =>
                        item.key === draft.key
                          ? { ...item, description: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Cantidad">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={draft.quantity}
                  onChange={(event) =>
                    setServiceDrafts((current) =>
                      current.map((item) =>
                        item.key === draft.key
                          ? { ...item, quantity: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Precio">
                <Input
                  type="number"
                  min={0}
                  value={draft.unitPrice}
                  onChange={(event) =>
                    setServiceDrafts((current) =>
                      current.map((item) =>
                        item.key === draft.key
                          ? { ...item, unitPrice: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={serviceDrafts.length === 1}
                  onClick={() =>
                    setServiceDrafts((current) =>
                      current.filter((item) => item.key !== draft.key),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              setServiceDrafts((current) => [
                ...current,
                {
                  key: crypto.randomUUID(),
                  serviceId: '',
                  description: '',
                  quantity: '1',
                  unitPrice: '0',
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Servicio
          </Button>
        </div>
      </Modal>

      <Modal
        open={deliverTarget !== null}
        onClose={() => setDeliverTarget(null)}
        title="Entregar prenda"
        description={
          deliverTarget
            ? `Prenda ${deliverTarget.garment_number} · ${deliverTarget.garment_type}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeliverTarget(null)}>
              Cancelar
            </Button>
            <Button loading={delivering} onClick={submitDeliver}>
              Confirmar entrega
            </Button>
          </>
        }
      >
        {deliverTarget ? (
          <div className="flex flex-col gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="flex justify-between">
                <span>Precio del arreglo</span>
                <span>{formatCurrency(deliverTarget.service_price)}</span>
              </p>
              <p className="flex justify-between">
                <span>Pagado previamente</span>
                <span>{formatCurrency(deliverPaid)}</span>
              </p>
              <p className="flex justify-between">
                <span>
                  Guarda ({storagePreview?.daysOver ?? 0} día(s) sobre gracia)
                </span>
                <span>{formatCurrency(deliverFee)}</span>
              </p>
              <p className="mt-1 flex justify-between border-t border-border pt-1 text-base font-semibold">
                <span>Saldo a cobrar</span>
                <span>{formatCurrency(deliverDue)}</span>
              </p>
            </div>

            {isAdmin && (storagePreview?.fee ?? 0) > 0 ? (
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={waiveFee}
                  onChange={(event) => setWaiveFee(event.target.checked)}
                />
                Perdonar cobro de almacenamiento (solo administrador)
              </label>
            ) : null}

            {deliverDue > 0 ? (
              <PaymentDraftsEditor
                drafts={deliverPayments}
                setDrafts={setDeliverPayments}
                due={deliverDue}
              />
            ) : (
              <p className="text-xs text-success">
                La prenda no tiene saldo pendiente; se entregará sin nuevo
                cobro.
              </p>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={bulkDeliverOpen}
        onClose={() => setBulkDeliverOpen(false)}
        title="Entrega conjunta"
        description="Cobra el saldo total y entrega varias prendas en una sola operación."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkDeliverOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={bulkDelivering}
              disabled={!bulkReady || bulkGarments.length === 0}
              onClick={submitBulkDeliver}
            >
              Entregar {bulkGarments.length}{' '}
              {bulkGarments.length === 1 ? 'prenda' : 'prendas'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          {bulkLoading ? (
            <p className="text-xs text-text-secondary">Calculando saldos…</p>
          ) : null}

          <div className="flex flex-col gap-2">
            {readyGarments.map((garment) => {
              const selected = bulkSelected.includes(garment.id)
              const preview = bulkPreviews[garment.id]
              return (
                <label
                  key={garment.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 p-2"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selected}
                    disabled={bulkLoading}
                    onChange={() => toggleBulkGarment(garment.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">
                      Prenda {garment.garment_number} · {garment.garment_type}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Servicio {formatCurrency(garment.service_price)} · Pagado{' '}
                      {formatCurrency(paidFor(garment.id))} · Guarda{' '}
                      {preview ? formatCurrency(preview.fee) : '…'}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">
                    {formatCurrency(dueFor(garment, bulkWaiveFee))}
                  </span>
                </label>
              )
            })}
          </div>

          {isAdmin &&
          bulkGarments.some(
            (garment) => (bulkPreviews[garment.id]?.fee ?? 0) > 0,
          ) ? (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={bulkWaiveFee}
                onChange={(event) => toggleBulkWaive(event.target.checked)}
              />
              Perdonar cobro de almacenamiento de las prendas seleccionadas
            </label>
          ) : null}

          <div className="flex justify-between rounded-lg bg-muted/50 p-3 text-base font-semibold">
            <span>Saldo a cobrar</span>
            <span>{formatCurrency(bulkDue)}</span>
          </div>

          {bulkDue > 0 ? (
            <PaymentDraftsEditor
              drafts={bulkPayments}
              setDrafts={setBulkPayments}
              due={bulkDue}
            />
          ) : (
            <p className="text-xs text-success">
              Las prendas no tienen saldo pendiente; se entregarán sin nuevo
              cobro.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Cancelar prenda"
        description="Si hay pagos, se registrará un reembolso."
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Volver
            </Button>
            <Button variant="danger" loading={working} onClick={submitCancel}>
              Cancelar prenda
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Motivo" hint="Obligatorio">
            <Textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </Field>
          {cancelTarget && paidFor(cancelTarget.id) > 0 ? (
            <Field
              label="Método de reembolso"
              hint={`Pagado: ${formatCurrency(paidFor(cancelTarget.id))}`}
            >
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
          ) : null}
        </div>
      </Modal>

      <Modal
        open={notifyTarget !== null}
        onClose={() => setNotifyTarget(null)}
        title="Registrar aviso"
        footer={
          <>
            <Button variant="outline" onClick={() => setNotifyTarget(null)}>
              Cancelar
            </Button>
            <Button loading={working} onClick={submitNotify}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Medio">
            <Select
              value={notifyMethod}
              onChange={(event) =>
                setNotifyMethod(event.target.value as typeof notifyMethod)
              }
            >
              {Object.entries(NOTIFICATION_METHOD_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Field label="Resultado">
            <Select
              value={notifyResult}
              onChange={(event) => setNotifyResult(event.target.value)}
            >
              {Object.entries(NOTIFICATION_RESULT_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Field label="Notas">
            <Textarea
              value={notifyNotes}
              onChange={(event) => setNotifyNotes(event.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={voidTarget !== null}
        onClose={() => setVoidTarget(null)}
        title="Anular material"
        description="Se devuelve el stock y se conserva el historial."
        footer={
          <>
            <Button variant="outline" onClick={() => setVoidTarget(null)}>
              Volver
            </Button>
            <Button variant="danger" loading={working} onClick={submitVoid}>
              Anular material
            </Button>
          </>
        }
      >
        <Field label="Motivo" hint="Obligatorio">
          <Textarea
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
          />
        </Field>
      </Modal>

      <p className="mt-4 text-xs text-text-secondary">
        Estados posibles: {Object.values(GARMENT_STATUS_LABELS).join(' · ')}
      </p>
    </div>
  )
}
