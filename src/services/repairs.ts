import { supabase, unwrap } from '@/lib/supabase'
import type {
  GarmentInput,
  GarmentPhoto,
  GarmentStatus,
  NotificationEntry,
  Payment,
  PaymentInput,
  PendingRow,
  PickupRow,
  RepairGarment,
  RepairOrder,
  StatusHistoryEntry,
} from '@/types'

export async function listRepairOrders(options: {
  from?: string
  to?: string
  status?: string
  limit?: number
} = {}) {
  let query = supabase
    .from('repair_orders')
    .select(
      '*, customers(*), repair_garments(id, garment_number, garment_type, color, status, service_price, ready_at, estimated_ready_at, storage_fee_charged)',
    )
    .order('received_at', { ascending: false })
    .limit(options.limit ?? 200)

  if (options.from) query = query.gte('received_at', options.from)
  if (options.to) query = query.lte('received_at', options.to)
  if (options.status) query = query.eq('status', options.status)

  return unwrap<RepairOrder[]>(query)
}

export async function getRepairOrder(id: string) {
  const [order, garments] = await Promise.all([
    unwrap<RepairOrder>(
      supabase.from('repair_orders').select('*, customers(*)').eq('id', id).single(),
    ),
    unwrap<RepairGarment[]>(
      supabase
        .from('repair_garments')
        .select('*, repair_garment_services(*), repair_materials(*, products(name, unit))')
        .eq('repair_order_id', id)
        .order('garment_number'),
    ),
  ])

  const garmentIds = garments.map((garment) => garment.id)

  const payments = await unwrap<Payment[]>(
    supabase
      .from('payments')
      .select('*')
      .eq('repair_order_id', id)
      .order('paid_at'),
  )

  const [orderHistory, orderNotifications, orderPhotos] =
    garmentIds.length === 0
      ? ([[] as StatusHistoryEntry[], [] as NotificationEntry[], [] as GarmentPhoto[]] as const)
      : await Promise.all([
          unwrap<StatusHistoryEntry[]>(
            supabase
              .from('repair_status_history')
              .select('*')
              .in('garment_id', garmentIds)
              .order('changed_at', { ascending: false }),
          ),
          unwrap<NotificationEntry[]>(
            supabase
              .from('repair_notifications')
              .select('*')
              .in('garment_id', garmentIds)
              .order('notified_at', { ascending: false }),
          ),
          unwrap<GarmentPhoto[]>(
            supabase
              .from('garment_photos')
              .select('*')
              .in('garment_id', garmentIds)
              .order('created_at'),
          ),
        ])

  const balances: Record<string, number> = {}
  await Promise.all(
    garments.map(async (garment) => {
      balances[garment.id] = await getGarmentBalance(garment.id)
    }),
  )

  return {
    order,
    garments,
    payments,
    history: orderHistory,
    notifications: orderNotifications,
    photos: orderPhotos,
    balances,
  }
}

export async function createRepairOrder(input: {
  customerId: string
  garments: GarmentInput[]
  notes?: string | null
  depositAmount?: number
  depositMethod?: string | null
}) {
  return unwrap<string>(
    supabase.rpc('create_repair_order', {
      p_customer_id: input.customerId,
      p_garments: input.garments,
      p_notes: input.notes ?? null,
      p_deposit_amount: input.depositAmount ?? 0,
      p_deposit_method: input.depositMethod ?? null,
    }),
  )
}

export async function setGarmentStatus(
  garmentId: string,
  status: GarmentStatus,
) {
  return unwrap<null>(
    supabase.rpc('set_garment_status', {
      p_garment_id: garmentId,
      p_new_status: status,
    }),
  )
}

export async function setGarmentServices(
  garmentId: string,
  services: GarmentInput['services'],
) {
  return unwrap<null>(
    supabase.rpc('set_garment_services', {
      p_garment_id: garmentId,
      p_services: services,
    }),
  )
}

export async function addRepairMaterial(input: {
  garmentId: string
  productId: string
  quantity: number
  notes?: string | null
}) {
  return unwrap<string>(
    supabase.rpc('add_repair_material', {
      p_garment_id: input.garmentId,
      p_product_id: input.productId,
      p_quantity: input.quantity,
      p_notes: input.notes ?? null,
    }),
  )
}

export async function voidRepairMaterial(materialId: string, reason: string) {
  return unwrap<null>(
    supabase.rpc('void_repair_material', {
      p_material_id: materialId,
      p_reason: reason,
    }),
  )
}

export async function registerGarmentPayment(
  garmentId: string,
  payment: PaymentInput,
) {
  return unwrap<string>(
    supabase.rpc('register_garment_payment', {
      p_garment_id: garmentId,
      p_amount: payment.amount,
      p_payment_method: payment.payment_method,
      p_reference_number: payment.reference_number ?? null,
    }),
  )
}

export async function deliverGarment(input: {
  garmentId: string
  payments: PaymentInput[]
  waiveStorageFee?: boolean
}) {
  return unwrap<{
    garment_id: string
    service_price: number
    storage_fee: number
    previously_paid: number
    collected_now: number
  }>(
    supabase.rpc('deliver_garment', {
      p_garment_id: input.garmentId,
      p_payments: input.payments.map((payment) => ({
        amount: payment.amount,
        payment_method: payment.payment_method,
        reference_number: payment.reference_number ?? null,
      })),
      p_waive_storage_fee: input.waiveStorageFee ?? false,
    }),
  )
}

export async function cancelGarment(
  garmentId: string,
  reason: string,
  refundMethod?: string | null,
) {
  return unwrap<null>(
    supabase.rpc('cancel_garment', {
      p_garment_id: garmentId,
      p_reason: reason,
      p_refund_method: refundMethod ?? null,
    }),
  )
}

export async function logGarmentNotification(input: {
  garmentId: string
  method: 'whatsapp' | 'phone_call' | 'in_person' | 'other'
  result?: string
  notes?: string | null
}) {
  return unwrap<string>(
    supabase.rpc('log_garment_notification', {
      p_garment_id: input.garmentId,
      p_method: input.method,
      p_result: input.result ?? 'contacted',
      p_notes: input.notes ?? null,
    }),
  )
}

export async function getGarmentBalance(garmentId: string) {
  const value = await unwrap<number | null>(
    supabase.rpc('garment_balance', { p_garment_id: garmentId }),
  )
  return Number(value ?? 0)
}

export async function getStoragePreview(garment: {
  ready_at: string | null
  storage_grace_days: number
  storage_fee_mode: 'none' | 'per_day' | 'fixed'
  storage_fee_amount: number
}) {
  const [days, fee] = await Promise.all([
    unwrap<number>(
      supabase.rpc('storage_days_over', {
        p_ready_at: garment.ready_at,
        p_grace_days: garment.storage_grace_days,
      }),
    ),
    unwrap<number>(
      supabase.rpc('calc_storage_fee', {
        p_ready_at: garment.ready_at,
        p_grace_days: garment.storage_grace_days,
        p_mode: garment.storage_fee_mode,
        p_amount: garment.storage_fee_amount,
      }),
    ),
  ])
  return { daysOver: Number(days ?? 0), fee: Number(fee ?? 0) }
}

export async function listPickupGarments() {
  return unwrap<PickupRow[]>(
    supabase.from('v_repair_pickup_list').select('*').order('ready_at'),
  )
}

export async function listPendingGarments() {
  return unwrap<PendingRow[]>(
    supabase.from('v_repair_pending').select('*').order('received_at'),
  )
}
