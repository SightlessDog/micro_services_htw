import type { ReactNode } from 'react'

type Variant = 'default' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

interface BadgeProps {
  children: ReactNode
  variant?: Variant
}

const variants: Record<Variant, string> = {
  default: 'bg-[#2a2a35] text-[#8888a0]',
  pending: 'bg-amber-500/12 text-amber-400 border border-amber-500/25',
  confirmed: 'bg-blue-500/12 text-blue-400 border border-blue-500/25',
  shipped: 'bg-purple-500/12 text-purple-400 border border-purple-500/25',
  delivered: 'bg-green-500/12 text-green-400 border border-green-500/25',
  cancelled: 'bg-red-500/12 text-red-400 border border-red-500/25',
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
