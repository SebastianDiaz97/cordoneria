import type { ReactNode } from 'react'
import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn('h-5 w-5 animate-spin text-primary', className)} />
  )
}

export function LoadingBlock({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className='flex flex-col items-center justify-center gap-3 py-12 text-sm text-text-secondary'>
      <Spinner />
      {label}
    </div>
  )
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-10 text-center'>
      <AlertCircle className='h-8 w-8 text-danger' />
      <div>
        <p className='text-sm font-medium text-text-primary'>
          No se pudieron cargar los datos
        </p>
        <p className='mt-1 max-w-xl text-xs text-text-secondary'>{message}</p>
      </div>
      {onRetry ? (
        <Button variant='outline' size='sm' onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title = 'Sin registros',
  description,
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className='flex flex-col items-center justify-center gap-2 px-4 py-12 text-center'>
      <Inbox className='h-8 w-8 text-text-secondary/60' />
      <p className='text-sm font-medium text-text-primary'>{title}</p>
      {description ? (
        <p className='max-w-md text-xs text-text-secondary'>{description}</p>
      ) : null}
      {action ? <div className='mt-2'>{action}</div> : null}
    </div>
  )
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className='w-full overflow-x-auto'>
      <table className='w-full min-w-[640px] border-collapse text-sm'>
        {children}
      </table>
    </div>
  )
}

export function Th({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        'border-b border-border bg-muted/60 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn('border-b border-border/70 px-3 py-2.5 align-middle', className)}
    >
      {children}
    </td>
  )
}
