import { create } from 'zustand'
import type { Product } from '../types'

interface CartItem {
  product: Product
  quantity: number
}

interface CartStore {
  items: CartItem[]
  add: (product: Product, qty?: number) => void
  remove: (productId: number) => void
  update: (productId: number, qty: number) => void
  clear: () => void
  total: () => number
  count: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  add: (product, qty = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i,
          ),
        }
      }
      return { items: [...state.items, { product, quantity: qty }] }
    }),

  remove: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) })),

  update: (productId, qty) =>
    set((state) => ({
      items:
        qty <= 0
          ? state.items.filter((i) => i.product.id !== productId)
          : state.items.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i)),
    })),

  clear: () => set({ items: [] }),
  total: () => get().items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0),
  count: () => get().items.reduce((s, i) => s + i.quantity, 0),
}))
