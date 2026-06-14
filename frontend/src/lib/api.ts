import type { Product, Order, UserProfile, UserProfileUpdate } from '../types'
import { useAuthStore } from '../store/authStore'

function getToken(): string | null {
  return useAuthStore.getState().token
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const t = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (t) headers['Authorization'] = `Bearer ${t}`

  const res = await fetch(path, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, string>
    throw new Error(body['detail'] ?? body['error'] ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export interface ProductInput {
  name: string
  description: string
  price: number
  stock: number
  category: string
}

export const api = {
  getProducts: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.category) q.set('category', params.category)
    if (params?.search) q.set('search', params.search)
    const qs = q.toString()
    return req<Product[]>(`/products${qs ? `?${qs}` : ''}`)
  },

  createProduct: (data: ProductInput) =>
    req<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),

  updateProduct: (id: number, data: ProductInput) =>
    req<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteProduct: (id: number) =>
    req<void>(`/products/${id}`, { method: 'DELETE' }),

  getOrders: () => req<Order[]>('/orders'),

  getAllOrders: () => req<Order[]>('/orders/all'),

  updateOrderStatus: (id: string, status: Order['status']) =>
    req<Order>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  createOrder: (items: { product_id: number; quantity: number }[]) =>
    req<Order>('/orders', { method: 'POST', body: JSON.stringify({ items }) }),

  cancelOrder: (id: string) =>
    req<{ message: string }>(`/orders/${id}`, { method: 'DELETE' }),

  getProfile: () => req<UserProfile>('/users/me'),

  updateProfile: (data: UserProfileUpdate) =>
    req<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
}
