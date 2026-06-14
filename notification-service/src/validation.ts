import type { OrderEvent, OrderItem } from "./types";

function isOrderItem(value: unknown): value is OrderItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.product_id === "number" &&
    typeof item.name === "string" &&
    typeof item.quantity === "number" &&
    typeof item.unit_price === "number" &&
    typeof item.subtotal === "number"
  );
}

export function parseOrderEvent(raw: unknown): OrderEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const event = raw as Record<string, unknown>;

  if (event.eventType !== "order.placed" && event.eventType !== "order.cancelled") return null;
  if (typeof event.orderId !== "string") return null;
  if (typeof event.userId !== "string") return null;
  if (event.userEmail !== undefined && typeof event.userEmail !== "string") return null;
  if (typeof event.total !== "number") return null;
  if (!Array.isArray(event.items) || !event.items.every(isOrderItem)) return null;

  if (event.eventType === "order.placed" && typeof event.createdAt !== "string") return null;
  if (event.eventType === "order.cancelled" && typeof event.cancelledAt !== "string") return null;

  return event as unknown as OrderEvent;
}
