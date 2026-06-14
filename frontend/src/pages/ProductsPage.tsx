import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Pills } from '../components/ui/Pills'
import type { Product } from '../types'

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const { user } = useAuthStore()
  const addToCart = useCartStore((s) => s.add)
  const cartItems = useCartStore((s) => s.items)

  const hasFilters = !!(search.trim() || category)

  const { data: allProducts = [], isLoading: isAllLoading, error: allError } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => api.getProducts(),
  })

  const {
    data: filteredProducts,
    isLoading: isFilteredLoading,
    error: filteredError,
  } = useQuery({
    queryKey: ['products', search, category],
    queryFn: () =>
      api.getProducts({
        search: search.trim() || undefined,
        category: category || undefined,
      }),
    enabled: hasFilters,
  })

  const products = hasFilters ? filteredProducts ?? [] : allProducts
  const isLoading = hasFilters ? isFilteredLoading : isAllLoading
  const error = hasFilters ? filteredError : allError

  const categories = [...new Set(allProducts.map((p) => p.category))].sort()

  function cartQtyFor(productId: number) {
    return cartItems.find((i) => i.product.id === productId)?.quantity ?? 0
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
          {products.length > 0 && (
            <p className="mt-1 text-sm text-text-muted">{products.length} items</p>
          )}
        </div>
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base w-full sm:w-56 sm:ml-auto text-sm"
        />
      </div>

      {categories.length > 0 && (
        <div className="mb-8">
          <Pills
            options={[{ value: '', label: 'All' }, ...categories.map((c) => ({ value: c, label: c }))]}
            value={category}
            onChange={setCategory}
          />
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-52 bg-surface/50" />
          ))}
        </div>
      )}

      {error && (
        <div className="card border-red-800/40 bg-red-500/5 text-red-700 text-sm">
          Failed to load products — is the backend running on :8080?
        </div>
      )}

      {!isLoading && !error && products.length === 0 && (
        <div className="card flex flex-col items-center py-20 gap-4 text-text-muted">
          {search || category ? (
            <>
              <p>No products match your filters.</p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('')
                  setCategory('')
                }}
              >
                Clear filters
              </Button>
            </>
          ) : (
            <p>No products yet.</p>
          )}
        </div>
      )}

      {!isLoading && !error && products.length > 0 && (
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
    <div className="card flex flex-col gap-4 hover:border-border-strong transition-colors">
      <div className="flex items-start justify-between gap-3">
        <Badge>{product.category}</Badge>
        <span className="font-mono text-lg font-semibold text-accent leading-none">
          ${Number(product.price).toFixed(2)}
        </span>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold leading-snug">{product.name}</h3>
        {product.description && (
          <p className="mt-1 text-sm text-text-muted line-clamp-2">{product.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
        <span className={`text-xs ${outOfStock ? 'text-red-700' : 'text-text-muted'}`}>
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
          <span className="text-xs text-text-faint">Sign in to order</span>
        )}
      </div>
    </div>
  )
}
