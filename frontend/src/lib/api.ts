import type { User, Product, Order } from '../types'

function getToken(): string | null {
  return localStorage.getItem('access_token')
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

  return res.json() as Promise<T>
}

export const api = {
  register: (data: { email: string; full_name: string; password: string }) =>
    req<User>('/users/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    req<{ access_token: string; token_type: string; user: User }>('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProducts: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.category) q.set('category', params.category)
    if (params?.search) q.set('search', params.search)
    const qs = q.toString()
    return req<Product[]>(`/products${qs ? `?${qs}` : ''}`)
  },

  getOrders: () => req<Order[]>('/orders'),

  createOrder: (items: { product_id: number; quantity: number }[]) =>
    req<Order>('/orders', { method: 'POST', body: JSON.stringify({ items }) }),

  cancelOrder: (id: string) =>
    req<{ message: string }>(`/orders/${id}`, { method: 'DELETE' }),
}
