import type { ReactNode } from 'react'

type Variant = 'default' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

interface BadgeProps {
  children: ReactNode
  variant?: Variant
}

const variants: Record<Variant, string> = {
  default: 'bg-border text-text-muted',
  pending: 'bg-amber-500/12 text-amber-700 border border-amber-500/25',
  confirmed: 'bg-blue-500/12 text-blue-700 border border-blue-500/25',
  shipped: 'bg-purple-500/12 text-purple-700 border border-purple-500/25',
  delivered: 'bg-green-500/12 text-green-700 border border-green-500/25',
  cancelled: 'bg-red-500/12 text-red-700 border border-red-500/25',
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${variants[variant]}`}
    >
      {children}
    </span>
  )
}
