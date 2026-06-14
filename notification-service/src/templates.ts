import type { EmailContent, OrderCancelledEvent, OrderItem, OrderPlacedEvent } from "./types";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function itemsText(items: OrderItem[]): string {
  return items
    .map((item) => `  - ${item.name} x${item.quantity} — $${item.subtotal.toFixed(2)}`)
    .join("\n");
}

function itemsHtml(items: OrderItem[]): string {
  const rows = items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>$${item.subtotal.toFixed(2)}</td></tr>`,
    )
    .join("");
  return `<table cellpadding="6"><thead><tr><th align="left">Item</th><th align="left">Qty</th><th align="left">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderOrderPlaced(event: OrderPlacedEvent): EmailContent {
  const orderRef = event.orderId.slice(0, 8);
  return {
    subject: `Order confirmed — #${orderRef}`,
    text: [
      "Thanks for your order!",
      "",
      `Order #${event.orderId}`,
      itemsText(event.items),
      "",
      `Total: $${event.total.toFixed(2)}`,
    ].join("\n"),
    html: [
      "<h2>Thanks for your order!</h2>",
      `<p>Order <code>#${escapeHtml(event.orderId)}</code></p>`,
      itemsHtml(event.items),
      `<p><strong>Total: $${event.total.toFixed(2)}</strong></p>`,
    ].join("\n"),
  };
}

export function renderOrderCancelled(event: OrderCancelledEvent): EmailContent {
  const orderRef = event.orderId.slice(0, 8);
  return {
    subject: `Order cancelled — #${orderRef}`,
    text: [
      "Your order has been cancelled.",
      "",
      `Order #${event.orderId}`,
      itemsText(event.items),
      "",
      `Total: $${event.total.toFixed(2)}`,
    ].join("\n"),
    html: [
      "<h2>Your order has been cancelled</h2>",
      `<p>Order <code>#${escapeHtml(event.orderId)}</code></p>`,
      itemsHtml(event.items),
      `<p><strong>Total: $${event.total.toFixed(2)}</strong></p>`,
    ].join("\n"),
  };
}
