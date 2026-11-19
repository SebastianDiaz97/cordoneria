import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-[#252b28]/40 p-0 sm:items-center sm:p-4'>
      <div
        className='absolute inset-0'
        onClick={onClose}
        aria-hidden='true'
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-label={title}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl',
          widths[size],
        )}
      >
        <div className='flex items-start justify-between gap-4 border-b border-border px-5 py-4'>
          <div>
            <h2 className='text-base font-semibold text-text-primary'>
              {title}
            </h2>
            {description ? (
              <p className='mt-0.5 text-xs text-text-secondary'>
                {description}
              </p>
            ) : null}
          </div>
          <Button variant='ghost' size='icon' onClick={onClose} aria-label='Cerrar'>
            <X className='h-4 w-4' />
          </Button>
        </div>
        <div className='flex-1 overflow-y-auto px-5 py-4'>{children}</div>
        {footer ? (
          <div className='flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3'>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
