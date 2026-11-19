import type { PaymentMethod } from '@/types'

export interface TenderRow {
  method: PaymentMethod
  amount: number
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

export function summarizeTender(rows: TenderRow[], due: number) {
  const cash = roundMoney(
    rows
      .filter((row) => row.method === 'cash')
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
  )
  const nonCash = roundMoney(
    rows
      .filter((row) => row.method !== 'cash')
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
  )
  const tendered = roundMoney(cash + nonCash)
  const change = roundMoney(Math.max(tendered - due, 0))
  const missing = roundMoney(Math.max(due - tendered, 0))
  const nonCashExcess = roundMoney(Math.max(nonCash - due, 0))

  return {
    cash,
    nonCash,
    tendered,
    change,
    missing,
    nonCashExcess,
    valid: nonCashExcess < 0.01 && missing < 0.01,
  }
}

/**
 * Ajusta lo recibido al monto que realmente se registra: lo pagado con
 * métodos distintos de efectivo se mantiene igual y el efectivo absorbe el
 * saldo restante. El excedente de efectivo es el vuelto.
 */
export function appliedTenderAmounts<T extends TenderRow>(
  rows: T[],
  due: number,
): T[] {
  const nonCash = rows
    .filter((row) => row.method !== 'cash')
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  let cashRemaining = roundMoney(Math.max(due - nonCash, 0))

  return rows
    .map((row) => {
      if (row.method !== 'cash') {
        return { ...row, amount: roundMoney(Number(row.amount) || 0) }
      }
      const amount = roundMoney(
        Math.min(Math.max(Number(row.amount) || 0, 0), cashRemaining),
      )
      cashRemaining = roundMoney(cashRemaining - amount)
      return { ...row, amount }
    })
    .filter((row) => row.amount > 0)
}
