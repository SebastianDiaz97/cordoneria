import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface shadow-soft',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3',
        className,
      )}
    >
      <div>
        <h2 className='text-base font-semibold text-text-primary'>{title}</h2>
        {description ? (
          <p className='mt-0.5 text-xs text-text-secondary'>{description}</p>
        ) : null}
      </div>
      {actions ? <div className='flex items-center gap-2'>{actions}</div> : null}
    </div>
  )
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('p-4', className)}>{children}</div>
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className='mb-4 flex flex-wrap items-end justify-between gap-3'>
      <div>
        <h1 className='text-2xl font-semibold text-text-primary'>{title}</h1>
        {description ? (
          <p className='mt-1 text-sm text-text-secondary'>{description}</p>
        ) : null}
      </div>
      {actions ? <div className='flex flex-wrap gap-2'>{actions}</div> : null}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const tones: Record<string, string> = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  }
  return (
    <Card className='p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-xs font-medium uppercase tracking-wide text-text-secondary'>
            {label}
          </p>
          <p className='mt-1 truncate text-xl font-semibold text-text-primary'>
            {value}
          </p>
          {hint ? (
            <p className='mt-1 text-xs text-text-secondary'>{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div className={cn('rounded-lg p-2', tones[tone])}>{icon}</div>
        ) : null}
      </div>
    </Card>
  )
}
