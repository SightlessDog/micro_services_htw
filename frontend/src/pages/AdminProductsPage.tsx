import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ProductInput } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ProductForm } from '../components/admin/ProductForm'
import type { Product } from '../types'

export function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', 'admin'],
    queryFn: () => api.getProducts(),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const { mutate: createProduct, isPending: isCreating } = useMutation({
    mutationFn: (data: ProductInput) => api.createProduct(data),
    onSuccess: () => {
      invalidate()
      setShowCreate(false)
      setFormError('')
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to create product'),
  })

  const { mutate: updateProduct, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductInput }) => api.updateProduct(id, data),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
      setFormError('')
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to update product'),
  })

  const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => api.deleteProduct(id),
    onSuccess: () => invalidate(),
  })

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Manage products</h1>
        {!showCreate && (
          <Button
            onClick={() => {
              setShowCreate(true)
              setEditingId(null)
              setFormError('')
            }}
          >
            New product
          </Button>
        )}
      </div>

      {showCreate && (
        <div className="card mb-6">
          <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-4">
            New product
          </h2>
          <ProductForm
            onSubmit={(data) => createProduct(data)}
            onCancel={() => {
              setShowCreate(false)
              setFormError('')
            }}
            isPending={isCreating}
            error={formError}
          />
        </div>
      )}

      {isLoading && (
        <div className="card divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse h-10 bg-surface/50 my-3 rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="card border-red-800/40 bg-red-500/5 text-red-700 text-sm">
          Failed to load products.
        </div>
      )}

      {!isLoading && !error && products.length > 0 && (
        <div className="card divide-y divide-border">
          {products.map((product) => (
            <div key={product.id} className={editingId === product.id ? 'py-4' : 'py-3'}>
              {editingId === product.id ? (
                <ProductForm
                  initial={product}
                  onSubmit={(data) => updateProduct({ id: product.id, data })}
                  onCancel={() => {
                    setEditingId(null)
                    setFormError('')
                  }}
                  isPending={isUpdating}
                  error={formError}
                />
              ) : (
                <ProductRow
                  product={product}
                  onEdit={() => {
                    setEditingId(product.id)
                    setShowCreate(false)
                    setFormError('')
                  }}
                  onDelete={() => deleteProduct(product.id)}
                  isDeleting={isDeleting}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && products.length === 0 && (
        <div className="card flex flex-col items-center py-20 gap-4 text-text-muted">
          <p>No products yet.</p>
          {!showCreate && (
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreate(true)
                setEditingId(null)
                setFormError('')
              }}
            >
              New product
            </Button>
          )}
        </div>
      )}
    </main>
  )
}

interface ProductRowProps {
  product: Product
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

function ProductRow({ product, onEdit, onDelete, isDeleting }: ProductRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap min-w-0">
        <Badge>{product.category}</Badge>
        <div className="min-w-0">
          <p className="font-medium truncate">{product.name}</p>
          <p className="text-xs text-text-muted">
            ${Number(product.price).toFixed(2)} · {product.stock} in stock
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  )
}
