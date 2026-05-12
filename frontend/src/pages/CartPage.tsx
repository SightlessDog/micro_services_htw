import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCartStore } from '../store/cartStore'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'

export function CartPage() {
  const { items, remove, update, clear, total, count } = useCartStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: () =>
      api.createOrder(items.map((i) => ({ product_id: i.product.id, quantity: i.quantity }))),
    onSuccess: () => {
      clear()
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate('/orders')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Order failed'),
  })

  if (count() === 0) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-8">Cart</h1>
        <div className="card flex flex-col items-center py-20 gap-4 text-[#8888a0]">
          <p>Your cart is empty.</p>
          <Link to="/products">
            <Button variant="ghost">Browse products</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-sm text-[#8888a0]">${Number(product.price).toFixed(2)} each</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => update(product.id, quantity - 1)}
                  className="w-7 h-7 rounded border border-border text-[#8888a0] hover:text-[#e8e8f0] hover:border-[#3a3a50] text-sm transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-mono">{quantity}</span>
                <button
                  onClick={() => update(product.id, quantity + 1)}
                  disabled={quantity >= product.stock}
                  className="w-7 h-7 rounded border border-border text-[#8888a0] hover:text-[#e8e8f0] hover:border-[#3a3a50] text-sm transition-colors disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <span className="font-mono text-sm text-accent w-20 text-right shrink-0">
                ${(Number(product.price) * quantity).toFixed(2)}
              </span>

              <button
                onClick={() => remove(product.id)}
                className="text-[#444458] hover:text-red-400 transition-colors shrink-0"
                aria-label="Remove"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        <div className="card h-fit space-y-4">
          <h2 className="text-[10px] font-semibold text-[#8888a0] uppercase tracking-widest">
            Summary
          </h2>

          <div className="space-y-2">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between text-sm gap-2">
                <span className="text-[#8888a0] truncate flex-1">
                  {product.name} × {quantity}
                </span>
                <span className="font-mono shrink-0">
                  ${(Number(product.price) * quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span className="font-mono text-accent">${total().toFixed(2)}</span>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button size="lg" className="w-full" onClick={() => placeOrder()} disabled={isPending}>
            {isPending ? 'Placing order…' : 'Place order'}
          </Button>

          <button
            onClick={clear}
            className="w-full text-xs text-[#444458] hover:text-[#8888a0] transition-colors py-1"
          >
            Clear cart
          </button>
        </div>
      </div>
    </main>
  )
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3,6 5,6 21,6" />
      <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" />
    </svg>
  )
}
