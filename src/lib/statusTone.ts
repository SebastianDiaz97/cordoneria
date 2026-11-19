export type StatusTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'gold'

export function statusTone(status: string): StatusTone {
  switch (status) {
    case 'ready':
      return 'success'
    case 'in_progress':
      return 'info'
    case 'received':
      return 'gold'
    case 'delivered':
      return 'neutral'
    case 'cancelled':
      return 'danger'
    case 'open':
      return 'info'
    case 'completed':
      return 'success'
    default:
      return 'neutral'
  }
}
