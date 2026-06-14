import type { Order } from '../types'

export const ORDER_STATUSES: Order['status'][] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
]

export const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })),
]
