import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
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
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Package,
  Scissors,
  ShoppingCart,
  Wallet2,
} from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { getDashboardData } from '@/services/dashboard'
import { formatCurrency, formatNumber, PAYMENT_METHOD_LABELS } from '@/lib/format'
import { Card, CardBody, CardHeader, PageHeader, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ErrorBlock, LoadingBlock } from '@/components/ui/States'
import { Select } from '@/components/ui/Input'

const CHART_COLORS = ['#243b35', '#d6a56d', '#3b82f6', '#16a36a', '#d97706']

type Period = 'today' | '7d' | '30d' | 'month'

function rangeFor(period: Period) {
  const now = new Date()
  const start = new Date(now)
  if (period === 'today') start.setHours(0, 0, 0, 0)
  if (period === '7d') start.setDate(start.getDate() - 6)
  if (period === '30d') start.setDate(start.getDate() - 29)
  if (period === 'month') start.setDate(1)
  start.setHours(0, 0, 0, 0)
  return { start, end: now }
}

function dayKey(value: string) {
  return value.slice(0, 10)
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('today')

  const { start, end } = useMemo(() => {
    const selected = rangeFor(period)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const from = selected.start < monthStart ? selected.start : monthStart
    return { start: from, end: selected.end }
  }, [period])

  const { data, loading, error, reload } = useAsync(
    () => getDashboardData(start.toISOString(), end.toISOString()),
    [start.getTime(), end.getTime()],
  )

  const metrics = useMemo(() => {
    if (!data) return null
    const selected = rangeFor(period)
    const inRange = (value: string) => {
      const time = new Date(value).getTime()
      return time >= selected.start.getTime() && time <= selected.end.getTime()
    }
    const completed = data.sales.filter(
      (sale) => sale.status === 'completed' && inRange(sale.sold_at),
    )
    const completedIds = new Set(completed.map((sale) => sale.id))

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const sumSales = (from: Date) =>
      data.sales
        .filter(
          (sale) =>
            sale.status === 'completed' &&
            new Date(sale.sold_at).getTime() >= from.getTime(),
        )
        .reduce((total, sale) => total + Number(sale.total), 0)

    const profit = data.saleItems
      .filter((item) => completedIds.has(item.sale_id))
      .reduce(
        (total, item) =>
          total +
          Number(item.line_total) -
          Number(item.quantity) * Number(item.unit_cost),
        0,
      )

    const periodPayments = data.payments.filter((payment) =>
      inRange(payment.paid_at),
    )
    const net = (payment: (typeof periodPayments)[number]) =>
      payment.payment_type === 'refund'
        ? -Number(payment.amount)
        : Number(payment.amount)

    const saleIncome = periodPayments
      .filter((payment) => payment.sale_id !== null)
      .reduce((total, payment) => total + net(payment), 0)
    const repairIncome = periodPayments
      .filter((payment) => payment.repair_order_id !== null)
      .reduce((total, payment) => total + net(payment), 0)

    const byDay = new Map<string, { day: string; ventas: number; ganancia: number }>()
    for (const sale of completed) {
      const key = dayKey(sale.sold_at)
      const row = byDay.get(key) ?? { day: key, ventas: 0, ganancia: 0 }
      row.ventas += Number(sale.total)
      byDay.set(key, row)
    }
    for (const item of data.saleItems) {
      if (!completedIds.has(item.sale_id)) continue
      const key = dayKey(item.sales?.sold_at ?? '')
      const row = byDay.get(key)
      if (row) {
        row.ganancia +=
          Number(item.line_total) - Number(item.quantity) * Number(item.unit_cost)
      }
    }

    const byMethod = new Map<string, number>()
    for (const payment of periodPayments) {
      if (payment.payment_type === 'refund') continue
      const label = PAYMENT_METHOD_LABELS[payment.payment_method] ?? 'Otro'
      byMethod.set(label, (byMethod.get(label) ?? 0) + Number(payment.amount))
    }

    const garmentCounts = data.garments.reduce<Record<string, number>>(
      (acc, garment) => {
        acc[garment.status] = (acc[garment.status] ?? 0) + 1
        return acc
      },
      {},
    )

    const late = data.pending.filter((row) => row.is_late).length

    return {
      todaySales: sumSales(todayStart),
      monthSales: sumSales(monthStart),
      count: completed.length,
      profit,
      saleIncome,
      repairIncome,
      lowStock: data.lowStock.length,
      pendingCount: data.pending.length,
      readyCount: data.pickup.length,
      lateCount: late,
      chartData: Array.from(byDay.values()).sort((a, b) =>
        a.day.localeCompare(b.day),
      ),
      methodData: Array.from(byMethod.entries()).map(([name, value]) => ({
        name,
        value,
      })),
      repairData: [
        { name: 'En proceso', value: (garmentCounts.in_progress ?? 0) + (garmentCounts.received ?? 0) },
        { name: 'Listas', value: garmentCounts.ready ?? 0 },
        { name: 'Entregadas', value: garmentCounts.delivered ?? 0 },
        { name: 'Canceladas', value: garmentCounts.cancelled ?? 0 },
      ],
      totalLowStock: data.lowStock.length,
    }
  }, [data, period])

  const periodLabels: Record<Period, string> = {
    today: 'hoy',
    '7d': 'últimos 7 días',
    '30d': 'últimos 30 días',
    month: 'este mes',
  }

  return (
    <div>
      <PageHeader
        title='Inicio'
        description={`Resumen del negocio · ${periodLabels[period]}`}
        actions={
          <Select
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            className='w-44'
          >
            <option value='today'>Hoy</option>
            <option value='7d'>Últimos 7 días</option>
            <option value='30d'>Últimos 30 días</option>
            <option value='month'>Este mes</option>
          </Select>
        }
      />

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} onRetry={reload} /> : null}

      {metrics ? (
        <div className='flex flex-col gap-4'>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <StatCard
              label='Ventas de hoy'
              value={formatCurrency(metrics.todaySales)}
              icon={<ShoppingCart className='h-5 w-5' />}
            />
            <StatCard
              label='Ventas del mes'
              value={formatCurrency(metrics.monthSales)}
              icon={<Wallet2 className='h-5 w-5' />}
              tone='info'
            />
            <StatCard
              label='Ventas del período'
              value={formatCurrency(metrics.saleIncome + metrics.repairIncome)}
              hint={`${formatNumber(metrics.count)} ventas · ${periodLabels[period]}`}
              icon={<CheckCircle2 className='h-5 w-5' />}
              tone='success'
            />
            <StatCard
              label='Ganancia estimada'
              value={formatCurrency(metrics.profit)}
              hint='Con costo histórico de cada venta'
              icon={<Package className='h-5 w-5' />}
              tone='warning'
            />
          </div>

          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <StatCard
              label='Dinero por ventas'
              value={formatCurrency(metrics.saleIncome)}
              hint={`Cobrado ${periodLabels[period]}`}
            />
            <StatCard
              label='Dinero por arreglos'
              value={formatCurrency(metrics.repairIncome)}
              hint={`Cobrado ${periodLabels[period]}`}
            />
            <StatCard
              label='Caja'
              value={
                data?.register
                  ? `Abierta · ${formatCurrency(data.register.opening_amount)}`
                  : 'Cerrada'
              }
              hint={data?.register ? 'Monto inicial' : 'Sin caja abierta'}
              tone={data?.register ? 'success' : 'default'}
            />
            <StatCard
              label='Stock bajo'
              value={formatNumber(metrics.lowStock)}
              hint='Productos por reponer'
              tone={metrics.lowStock > 0 ? 'danger' : 'success'}
              icon={<AlertTriangle className='h-5 w-5' />}
            />
          </div>

          <div className='grid gap-3 sm:grid-cols-3'>
            <Link to='/arreglos'>
              <Card className='p-4 transition-colors hover:border-primary/40'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs uppercase tracking-wide text-text-secondary'>
                      Arreglos pendientes
                    </p>
                    <p className='mt-1 text-xl font-semibold'>
                      {formatNumber(metrics.pendingCount)}
                    </p>
                  </div>
                  <Clock className='h-6 w-6 text-info' />
                </div>
              </Card>
            </Link>
            <Link to='/arreglos'>
              <Card className='p-4 transition-colors hover:border-primary/40'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs uppercase tracking-wide text-text-secondary'>
                      Listos para retirar
                    </p>
                    <p className='mt-1 text-xl font-semibold'>
                      {formatNumber(metrics.readyCount)}
                    </p>
                  </div>
                  <Scissors className='h-6 w-6 text-success' />
                </div>
              </Card>
            </Link>
            <Link to='/arreglos'>
              <Card className='p-4 transition-colors hover:border-primary/40'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs uppercase tracking-wide text-text-secondary'>
                      Arreglos atrasados
                    </p>
                    <p className='mt-1 text-xl font-semibold'>
                      {formatNumber(metrics.lateCount)}
                    </p>
                  </div>
                  <AlertTriangle className='h-6 w-6 text-danger' />
                </div>
              </Card>
            </Link>
          </div>

          <div className='grid gap-4 xl:grid-cols-2'>
            <Card>
              <CardHeader
                title='Ventas y ganancia por día'
                description='Solo ventas completadas del período'
              />
              <CardBody className='h-72'>
                {metrics.chartData.length === 0 ? (
                  <p className='flex h-full items-center justify-center text-sm text-text-secondary'>
                    Sin ventas en el período.
                  </p>
                ) : (
                  <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart data={metrics.chartData}>
                      <CartesianGrid stroke='#e5e7e3' vertical={false} />
                      <XAxis dataKey='day' tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value: number) =>
                          formatNumber(value, 0)
                        }
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                      />
                      <Legend />
                      <Area
                        type='monotone'
                        dataKey='ventas'
                        name='Ventas'
                        stroke='#243b35'
                        fill='#243b35'
                        fillOpacity={0.15}
                      />
                      <Area
                        type='monotone'
                        dataKey='ganancia'
                        name='Ganancia'
                        stroke='#d6a56d'
                        fill='#d6a56d'
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title='Ingresos por método de pago'
                description='Pagos de ventas y arreglos del período'
              />
              <CardBody className='h-72'>
                {metrics.methodData.length === 0 ? (
                  <p className='flex h-full items-center justify-center text-sm text-text-secondary'>
                    Sin pagos registrados.
                  </p>
                ) : (
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={metrics.methodData}
                        dataKey='value'
                        nameKey='name'
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {metrics.methodData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title='Resumen de arreglos' description='Por estado actual' />
              <CardBody className='h-64'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={metrics.repairData}>
                    <CartesianGrid stroke='#e5e7e3' vertical={false} />
                    <XAxis dataKey='name' tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey='value' name='Prendas' fill='#243b35' radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title='Productos con stock bajo'
                description='Reposición recomendada'
                actions={
                  <Link to='/inventario'>
                    <Button variant='ghost' size='sm'>
                      Ver inventario <ArrowRight className='h-3.5 w-3.5' />
                    </Button>
                  </Link>
                }
              />
              <CardBody className='max-h-64 overflow-y-auto p-0'>
                {data?.lowStock.length === 0 ? (
                  <p className='p-4 text-sm text-text-secondary'>
                    Sin productos bajo el stock mínimo.
                  </p>
                ) : (
                  <ul className='divide-y divide-border'>
                    {data?.lowStock.slice(0, 8).map((product) => (
                      <li
                        key={product.id}
                        className='flex items-center justify-between gap-3 px-4 py-2.5 text-sm'
                      >
                        <div className='min-w-0'>
                          <p className='truncate font-medium'>{product.name}</p>
                          <p className='text-xs text-text-secondary'>
                            Stock {formatNumber(product.current_stock, 2)} / mín.{' '}
                            {formatNumber(product.minimum_stock, 2)} {product.unit}
                          </p>
                        </div>
                        <span className='text-xs font-semibold text-danger'>
                          Faltan {formatNumber(product.missing, 2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
