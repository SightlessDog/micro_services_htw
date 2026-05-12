import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import type { Order } from '../types'

export function OrdersPage() {
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: api.getOrders,
  })

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
        {orders.length > 0 && (
          <p className="mt-1 text-sm text-[#8888a0]">{orders.length} orders</p>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-28 bg-surface/50" />
          ))}
        </div>
      )}

      {error && (
        <div className="card border-red-800/40 bg-red-500/5 text-red-400 text-sm">
          Failed to load orders.
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {orders.length === 0 && (
            <div className="card text-center py-20 text-[#8888a0]">No orders yet.</div>
          )}
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </main>
  )
}

function OrderCard({ order }: { order: Order }) {
  const queryClient = useQueryClient()

  const { mutate: cancel, isPending } = useMutation({
    mutationFn: () => api.cancelOrder(order.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })

  const date = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="card space-y-4 hover:border-[#3a3a50] transition-colors">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs text-[#444458]">#{order.id.slice(0, 8)}</span>
          <Badge variant={order.status}>{order.status}</Badge>
          <span className="text-xs text-[#8888a0]">{date}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono font-semibold text-accent">
            ${Number(order.total).toFixed(2)}
          </span>
          {order.status === 'pending' && (
            <Button variant="danger" size="sm" onClick={() => cancel()} disabled={isPending}>
              {isPending ? 'Cancelling…' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border pt-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm gap-2">
            <span className="text-[#8888a0] truncate flex-1">
              {item.name} × {item.quantity}
            </span>
            <span className="font-mono shrink-0">${Number(item.subtotal).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
