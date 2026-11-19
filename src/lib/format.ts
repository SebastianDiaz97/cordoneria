import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: digits,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return format(parseISO(value), "dd-MM-yyyy HH:mm", { locale: es })
  } catch {
    return value
  }
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'dd-MM-yyyy', { locale: es })
  } catch {
    return value
  }
}

export function toDateInput(value: string | Date = new Date()) {
  const d = typeof value === 'string' ? new Date(value) : value
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfDayISO(date: string) {
  return new Date(`${date}T00:00:00`).toISOString()
}

export function endOfDayISO(date: string) {
  return new Date(`${date}T23:59:59.999`).toISOString()
}

export const GARMENT_STATUS_LABELS: Record<string, string> = {
  received: 'Recibida',
  in_progress: 'En proceso',
  ready: 'Lista para retirar',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
  pending: 'Pendiente',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  debit_card: 'Débito',
  credit_card: 'Crédito',
  bank_transfer: 'Transferencia',
  other: 'Otro',
}

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  purchase: 'Compra',
  sale: 'Venta',
  repair_use: 'Uso en arreglo',
  adjustment_in: 'Ajuste (+)',
  adjustment_out: 'Ajuste (-)',
  customer_return: 'Devolución cliente',
  supplier_return: 'Devolución proveedor',
  expense: 'Gasto',
  withdrawal: 'Retiro',
  deposit: 'Depósito',
  other_income: 'Otro ingreso',
}

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  sale_payment: 'Pago de venta',
  repair_deposit: 'Abono de arreglo',
  repair_payment: 'Pago de arreglo',
  refund: 'Reembolso',
}

export const NOTIFICATION_METHOD_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone_call: 'Llamada',
  in_person: 'Presencial',
  other: 'Otro',
}

export const NOTIFICATION_RESULT_LABELS: Record<string, string> = {
  contacted: 'Contactado',
  no_answer: 'Sin respuesta',
  message_sent: 'Mensaje enviado',
  failed: 'Fallido',
  other: 'Otro',
}

export function whatsappLink(phone: string | null | undefined, message?: string) {
  if (!phone) return null
  const digits = phone.replace(/[^\d]/g, '')
  if (!digits) return null
  const normalized = digits.startsWith('56') ? digits : `56${digits}`
  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${normalized}${query}`
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const text = String(value ?? '')
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const csv = rows.map((row) => row.map(escape).join(';')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function todayInput() {
  return toDateInput(new Date())
}

export function monthStartInput() {
  const now = new Date()
  return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
}
