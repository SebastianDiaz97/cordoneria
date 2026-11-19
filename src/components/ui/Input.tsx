import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label?: string
  error?: string | null
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label className='text-xs font-medium text-text-secondary'>
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className='text-xs text-danger'>{error}</p> : null}
      {!error && hint ? (
        <p className='text-xs text-text-secondary'>{hint}</p>
      ) : null}
    </div>
  )
}

const controlClasses =
  'w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:bg-muted disabled:text-text-secondary'

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...rest} />
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClasses, 'min-h-20 resize-y', className)}
      {...rest}
    />
  )
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClasses, className)} {...rest}>
      {children}
    </select>
  )
}
