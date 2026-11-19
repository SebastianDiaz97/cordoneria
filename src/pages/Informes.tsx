import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { getDashboardData } from '@/services/dashboard'
import { listPurchases } from '@/services/inventory'
import {
  downloadCsv,
  endOfDayISO,
  formatCurrency,
  formatDate,
  formatNumber,
  monthStartInput,
  MOVEMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  startOfDayISO,
  todayInput,
} from '@/lib/format'
import { PageHeader, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/States'

const COLORS = ['#243b35', '#d6a56d', '#3b82f6', '#16a36a', '#d97706']

export default function Informes() {
  const [from, setFrom] = useState(monthStartInput())
  const [to, setTo] = useState(todayInput())

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [dashboard, purchases] = await Promise.all([
        getDashboardData(startOfDayISO(from), endOfDayISO(to)),
        listPurchases({ from: startOfDayISO(from), to: endOfDayISO(to) }),
      ])
      return { dashboard, purchases }
    },
    [from, to],
  )

  const report = useMemo(() => {
    if (!data) return null
    const { dashboard, purchases } = data
    const completed = dashboard.sales.filter((sale) => sale.status === 'completed')
    const completedIds = new Set(completed.map((sale) => sale.id))
    const items = dashboard.saleItems.filter((item) =>
      completedIds.has(item.sale_id),
    )

    const totalSales = completed.reduce(
      (total, sale) => total + Number(sale.total),
      0,
    )
    const profit = items.reduce(
      (total, item) =>
        total +
        Number(item.line_total) -
        Number(item.quantity) * Number(item.unit_cost),
      0,
    )

    const byDay = new Map<string, { day: string; ventas: number }>()
    for (const sale of completed) {
      const key = sale.sold_at.slice(0, 10)
      const row = byDay.get(key) ?? { day: key, ventas: 0 }
      row.ventas += Number(sale.total)
      byDay.set(key, row)
    }

    const byMethod = new Map<string, number>()
    for (const payment of dashboard.payments) {
      if (payment.payment_type === 'refund') continue
      const label = PAYMENT_METHOD_LABELS[payment.payment_method] ?? 'Otro'
      byMethod.set(label, (byMethod.get(label) ?? 0) + Number(payment.amount))
    }

    const productMap = new Map<
      string,
      { name: string; quantity: number; revenue: number; cost: number }
    >()
    for (const item of items) {
      const name = item.products?.name ?? 'Producto'
      const row = productMap.get(name) ?? {
        name,
        quantity: 0,
        revenue: 0,
        cost: 0,
      }
      row.quantity += Number(item.quantity)
      row.revenue += Number(item.line_total)
      row.cost += Number(item.quantity) * Number(item.unit_cost)
      productMap.set(name, row)
    }
    const topProducts = Array.from(productMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    )

    const customerMap = new Map<string, { name: string; count: number; total: number }>()
    for (const sale of completed) {
      const name = sale.customers?.full_name ?? 'Sin cliente'
      const row = customerMap.get(name) ?? { name, count: 0, total: 0 }
      row.count += 1
      row.total += Number(sale.total)
      customerMap.set(name, row)
    }
    const topCustomers = Array.from(customerMap.values()).sort(
      (a, b) => b.total - a.total,
    )

    const expenses = dashboard.movements
      .filter((movement) =>
        ['expense', 'withdrawal'].includes(movement.movement_type),
      )
      .reduce((total, movement) => total + Number(movement.amount), 0)
    const deposits = dashboard.movements
      .filter((movement) =>
        ['deposit', 'other_income'].includes(movement.movement_type),
      )
      .reduce((total, movement) => total + Number(movement.amount), 0)

    const statusCounts = dashboard.garments.reduce<Record<string, number>>(
      (acc, garment) => {
        acc[garment.status] = (acc[garment.status] ?? 0) + 1
        return acc
      },
      {},
    )

    const purchaseTotal = purchases.reduce(
      (total, purchase) => total + Number(purchase.total),
      0,
    )

    return {
      completed,
      totalSales,
      profit,
      tickets: completed.length,
      average: completed.length > 0 ? totalSales / completed.length : 0,
      byDay: Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)),
      methodData: Array.from(byMethod.entries()).map(([name, value]) => ({
        name,
        value,
      })),
      topProducts,
      topCustomers,
      lowStock: dashboard.lowStock,
      expenses,
      deposits,
      purchases,
      purchaseTotal,
      statusCounts,
      dailyCash: dashboard.dailyCash,
    }
  }, [data])

  function exportSales() {
    if (!report) return
    downloadCsv('ventas.csv', [
      ['Fecha', 'Cliente', 'Total'],
      ...report.completed.map((sale) => [
        formatDate(sale.sold_at),
        sale.customers?.full_name ?? 'Sin cliente',
        Number(sale.total),
      ]),
    ])
  }

  function exportProducts() {
    if (!report) return
    downloadCsv('productos.csv', [
      ['Producto', 'Cantidad', 'Ingresos', 'Costo', 'Ganancia'],
      ...report.topProducts.map((product) => [
        product.name,
        product.quantity,
        product.revenue,
        product.cost,
        product.revenue - product.cost,
      ]),
    ])
  }

  function exportCash() {
    if (!report) return
    downloadCsv('caja.csv', [
      ['Día', 'Origen', 'Método', 'Recibido', 'Reembolsado', 'Neto'],
      ...report.dailyCash.map((row) => [
        row.day,
        row.origin,
        PAYMENT_METHOD_LABELS[row.payment_method] ?? row.payment_method,
        row.received,
        row.refunded,
        row.net,
      ]),
    ])
  }

  return (
    <div>
      <PageHeader
        title='Informes'
        description='Ventas, ganancias, productos, arreglos y caja del período'
        actions={
          <>
            <Button variant='outline' size='sm' onClick={exportSales}>
              <Download className='h-3.5 w-3.5' /> Ventas CSV
            </Button>
            <Button variant='outline' size='sm' onClick={exportProducts}>
              <Download className='h-3.5 w-3.5' /> Productos CSV
            </Button>
            <Button variant='outline' size='sm' onClick={exportCash}>
              <Download className='h-3.5 w-3.5' /> Caja CSV
            </Button>
          </>
        }
      />

      <div className='mb-4 flex flex-wrap items-end gap-2'>
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
      </div>

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} onRetry={reload} /> : null}

      {report ? (
        <div className='flex flex-col gap-4'>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <StatCard label='Ventas del período' value={formatCurrency(report.totalSales)} />
            <StatCard
              label='Ganancia estimada'
              value={formatCurrency(report.profit)}
              tone='success'
            />
            <StatCard label='N° de ventas' value={formatNumber(report.tickets)} />
            <StatCard label='Ticket promedio' value={formatCurrency(report.average)} />
          </div>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <StatCard label='Compras registradas' value={formatCurrency(report.purchaseTotal)} />
            <StatCard label='Gastos y retiros' value={formatCurrency(report.expenses)} tone='danger' />
            <StatCard label='Depósitos / otros ingresos' value={formatCurrency(report.deposits)} tone='info' />
            <StatCard
              label='Arreglos'
              value={formatNumber(
                (report.statusCounts.received ?? 0) +
                  (report.statusCounts.in_progress ?? 0) +
                  (report.statusCounts.ready ?? 0) +
                  (report.statusCounts.delivered ?? 0) +
                  (report.statusCounts.cancelled ?? 0),
              )}
              hint={`${report.statusCounts.ready ?? 0} listos · ${report.statusCounts.delivered ?? 0} entregados`}
            />
          </div>

          <div className='grid gap-4 xl:grid-cols-2'>
            <section className='rounded-xl border border-border bg-surface shadow-soft'>
              <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
                Ventas por día
              </h2>
              <div className='h-64 p-3'>
                {report.byDay.length === 0 ? (
                  <p className='flex h-full items-center justify-center text-sm text-text-secondary'>
                    Sin ventas en el período.
                  </p>
                ) : (
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={report.byDay}>
                      <CartesianGrid stroke='#e5e7e3' vertical={false} />
                      <XAxis dataKey='day' tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value: number) => formatNumber(value)}
                      />
                      <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                      <Bar dataKey='ventas' name='Ventas' fill='#243b35' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className='rounded-xl border border-border bg-surface shadow-soft'>
              <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
                Ingresos por método de pago
              </h2>
              <div className='h-64 p-3'>
                {report.methodData.length === 0 ? (
                  <p className='flex h-full items-center justify-center text-sm text-text-secondary'>
                    Sin pagos en el período.
                  </p>
                ) : (
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={report.methodData}
                        dataKey='value'
                        nameKey='name'
                        innerRadius={45}
                        outerRadius={80}
                      >
                        {report.methodData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className='rounded-xl border border-border bg-surface shadow-soft'>
              <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
                Productos más vendidos
              </h2>
              {report.topProducts.length === 0 ? (
                <EmptyState title='Sin ventas de productos' />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Producto</Th>
                      <Th>Cant.</Th>
                      <Th>Ingresos</Th>
                      <Th>Ganancia</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topProducts.slice(0, 10).map((product) => (
                      <tr key={product.name}>
                        <Td>{product.name}</Td>
                        <Td>{formatNumber(product.quantity, 2)}</Td>
                        <Td>{formatCurrency(product.revenue)}</Td>
                        <Td>{formatCurrency(product.revenue - product.cost)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </section>

            <section className='rounded-xl border border-border bg-surface shadow-soft'>
              <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
                Clientes frecuentes
              </h2>
              {report.topCustomers.length === 0 ? (
                <EmptyState title='Sin clientes en el período' />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Cliente</Th>
                      <Th>Compras</Th>
                      <Th>Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topCustomers.slice(0, 10).map((customer) => (
                      <tr key={customer.name}>
                        <Td>{customer.name}</Td>
                        <Td>{customer.count}</Td>
                        <Td>{formatCurrency(customer.total)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </section>

            <section className='rounded-xl border border-border bg-surface shadow-soft'>
              <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
                Productos con stock bajo
              </h2>
              {report.lowStock.length === 0 ? (
                <EmptyState title='Sin productos bajo el mínimo' />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Producto</Th>
                      <Th>Stock</Th>
                      <Th>Mínimo</Th>
                      <Th>Faltante</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lowStock.map((product) => (
                      <tr key={product.id}>
                        <Td>{product.name}</Td>
                        <Td>{formatNumber(product.current_stock, 2)}</Td>
                        <Td>{formatNumber(product.minimum_stock, 2)}</Td>
                        <Td className='text-danger'>{formatNumber(product.missing, 2)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </section>

            <section className='rounded-xl border border-border bg-surface shadow-soft'>
              <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
                Compras del período ({report.purchases.length})
              </h2>
              {report.purchases.length === 0 ? (
                <EmptyState title='Sin compras en el período' />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>N°</Th>
                      <Th>Fecha</Th>
                      <Th>Proveedor</Th>
                      <Th>Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.purchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <Td>#{purchase.purchase_number}</Td>
                        <Td>{formatDate(purchase.purchased_at)}</Td>
                        <Td>{purchase.suppliers?.name ?? '—'}</Td>
                        <Td>{formatCurrency(purchase.total)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </section>

            <section className='rounded-xl border border-border bg-surface shadow-soft xl:col-span-2'>
              <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
                Movimientos de caja del período
              </h2>
              {(data?.dashboard.movements ?? []).length === 0 ? (
                <EmptyState title='Sin movimientos manuales' />
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
                    {(data?.dashboard.movements ?? []).map((movement) => (
                      <tr key={movement.id}>
                        <Td>{formatDate(movement.moved_at)}</Td>
                        <Td>
                          {MOVEMENT_TYPE_LABELS[movement.movement_type] ??
                            movement.movement_type}
                        </Td>
                        <Td>{movement.description}</Td>
                        <Td>{PAYMENT_METHOD_LABELS[movement.payment_method]}</Td>
                        <Td className='text-right'>
                          {formatCurrency(movement.amount)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  )
}
