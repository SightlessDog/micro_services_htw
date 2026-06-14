import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Pills } from '../components/ui/Pills'
import { ORDER_STATUSES, STATUS_FILTERS } from '../lib/orderStatus'
import type { Order } from '../types'

export function AdminOrdersPage() {
  const [status, setStatus] = useState('')
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders', 'all'],
    queryFn: api.getAllOrders,
  })

  const filtered = status ? orders.filter((o) => o.status === status) : orders

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">All orders</h1>
        {orders.length > 0 && (
          <p className="mt-1 text-sm text-text-muted">{orders.length} orders</p>
        )}
      </div>

      {orders.length > 0 && (
        <div className="mb-8">
          <Pills options={STATUS_FILTERS} value={status} onChange={setStatus} />
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-28 bg-surface/50" />
          ))}
        </div>
      )}

      {error && (
        <div className="card border-red-800/40 bg-red-500/5 text-red-700 text-sm">
          Failed to load orders.
        </div>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <div className="card text-center py-20 text-text-muted">No orders yet.</div>
      )}

      {!isLoading && !error && orders.length > 0 && filtered.length === 0 && (
        <div className="card text-center py-20 text-text-muted">No {status} orders.</div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((order) => (
            <AdminOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </main>
  )
}

function AdminOrderCard({ order }: { order: Order }) {
  const queryClient = useQueryClient()

  const { mutate: setStatus, isPending } = useMutation({
    mutationFn: (status: Order['status']) => api.updateOrderStatus(order.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })

  const date = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="card space-y-4 hover:border-border-strong transition-colors">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs text-text-placeholder">#{order.id.slice(0, 8)}</span>
          <Badge variant={order.status}>{order.status}</Badge>
          <span className="text-xs text-text-muted">{date}</span>
          <span className="text-xs text-text-faint font-mono">user {order.userId.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono font-semibold text-accent">
            ${Number(order.total).toFixed(2)}
          </span>
          <select
            value={order.status}
            onChange={(e) => setStatus(e.target.value as Order['status'])}
            disabled={isPending}
            className="input-base w-36 text-sm py-1.5"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border pt-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm gap-2">
            <span className="text-text-muted truncate flex-1">
              {item.name} × {item.quantity}
            </span>
            <span className="font-mono shrink-0">${Number(item.subtotal).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
