export interface OrderItem {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderPlacedEvent {
  eventType: "order.placed";
  orderId: string;
  userId: string;
  userEmail?: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
}

export interface OrderCancelledEvent {
  eventType: "order.cancelled";
  orderId: string;
  userId: string;
  userEmail?: string;
  items: OrderItem[];
  total: number;
  cancelledAt: string;
}

export type OrderEvent = OrderPlacedEvent | OrderCancelledEvent;

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}
