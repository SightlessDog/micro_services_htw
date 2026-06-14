export interface User {
  id: string
  email: string
  name: string
  roles: string[]
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
  phone_number: string | null
  address_street: string | null
  address_city: string | null
  address_postal_code: string | null
  address_country: string | null
}

export interface UserProfileUpdate {
  full_name?: string
  phone_number?: string | null
  address_street?: string | null
  address_city?: string | null
  address_postal_code?: string | null
  address_country?: string | null
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  category: string
  createdAt: string
  updatedAt: string
}

interface OrderItem {
  product_id: number
  name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  total: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
  updatedAt: string
}
