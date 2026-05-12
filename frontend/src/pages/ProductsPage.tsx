import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import type { Product } from '../types'

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const { user } = useAuthStore()
  const addToCart = useCartStore((s) => s.add)
  const cartItems = useCartStore((s) => s.items)

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', search, category],
    queryFn: () =>
      api.getProducts({
        search: search.trim() || undefined,
        category: category || undefined,
      }),
  })

  const categories = [...new Set(products.map((p) => p.category))].sort()

  function cartQtyFor(productId: number) {
    return cartItems.find((i) => i.product.id === productId)?.quantity ?? 0
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
          {products.length > 0 && (
            <p className="mt-1 text-sm text-[#8888a0]">{products.length} items</p>
          )}
        </div>
        <div className="flex gap-3 sm:ml-auto flex-wrap">
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base w-44 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-base w-40 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-52 bg-surface/50" />
          ))}
        </div>
      )}

      {error && (
        <div className="card border-red-800/40 bg-red-500/5 text-red-400 text-sm">
          Failed to load products — is the backend running on :8080?
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              cartQty={cartQtyFor(product.id)}
              canAddToCart={!!user}
              onAdd={() => addToCart(product)}
            />
          ))}
          {products.length === 0 && (
            <p className="col-span-3 text-center py-20 text-[#8888a0]">No products found.</p>
          )}
        </div>
      )}
    </main>
  )
}

interface ProductCardProps {
  product: Product
  cartQty: number
  canAddToCart: boolean
  onAdd: () => void
}

function ProductCard({ product, cartQty, canAddToCart, onAdd }: ProductCardProps) {
  const outOfStock = product.stock === 0

  return (
    <div className="card flex flex-col gap-4 hover:border-[#3a3a50] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <Badge>{product.category}</Badge>
        <span className="font-mono text-lg font-semibold text-accent leading-none">
          ${Number(product.price).toFixed(2)}
        </span>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold leading-snug">{product.name}</h3>
        {product.description && (
          <p className="mt-1 text-sm text-[#8888a0] line-clamp-2">{product.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
        <span className={`text-xs ${outOfStock ? 'text-red-400' : 'text-[#8888a0]'}`}>
          {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
        </span>

        {canAddToCart ? (
          <Button
            size="sm"
            onClick={onAdd}
            disabled={outOfStock}
            variant={cartQty > 0 ? 'ghost' : 'primary'}
          >
            {cartQty > 0 ? `In cart (${cartQty})` : 'Add to cart'}
          </Button>
        ) : (
          <span className="text-xs text-[#555570]">Sign in to order</span>
        )}
      </div>
    </div>
  )
}
