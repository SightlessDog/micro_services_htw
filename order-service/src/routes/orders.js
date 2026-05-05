const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { authenticate } = require("../middleware/auth");
const productClient = require("../services/productClient");

const router = express.Router();

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

function parseOrder(row) {
  return { ...row, items: JSON.parse(row.items) };
}

router.get("/", authenticate, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json(rows.map(parseOrder));
});

router.get("/:id", authenticate, (req, res) => {
  const row = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "Order not found" });
  if (row.user_id !== req.user.id)
    return res.status(403).json({ error: "Forbidden" });
  res.json(parseOrder(row));
});

router.post("/", authenticate, async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items must be a non-empty array" });
  }

  for (const item of items) {
    if (!item.product_id || !item.quantity || item.quantity < 1) {
      return res
        .status(400)
        .json({ error: "Each item needs product_id and quantity >= 1" });
    }
  }

  try {
    const enrichedItems = [];
    let total = 0;

    for (const item of items) {
      const product = await productClient.getProduct(item.product_id);

      enrichedItems.push({
        product_id: product.id,
        name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal: product.price * item.quantity,
      });
      total += product.price * item.quantity;
    }

    // Decrement stock for each product
    for (const item of enrichedItems) {
      await productClient.decrementStock(item.product_id, item.quantity);
    }

    const id = uuidv4();
    db.prepare(
      `INSERT INTO orders (id, user_id, items, total, status) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, req.user.id, JSON.stringify(enrichedItems), total, "pending");

    const order = parseOrder(
      db.prepare("SELECT * FROM orders WHERE id = ?").get(id),
    );
    res.status(201).json(order);
  } catch (err) {
    const status = err.response?.status === 404 ? 404 : 409;
    res
      .status(status)
      .json({ error: err.response?.data?.error || err.message });
  }
});

router.patch("/:id/status", authenticate, (req, res) => {
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const row = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "Order not found" });
  if (row.user_id !== req.user.id)
    return res.status(403).json({ error: "Forbidden" });

  db.prepare(
    `UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(status, req.params.id);

  const updated = parseOrder(
    db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id),
  );
  res.json(updated);
});

router.delete("/:id", authenticate, (req, res) => {
  const row = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "Order not found" });
  if (row.user_id !== req.user.id)
    return res.status(403).json({ error: "Forbidden" });
  if (row.status !== "pending") {
    return res
      .status(409)
      .json({ error: "Only pending orders can be cancelled" });
  }

  db.prepare(
    `UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
  ).run(req.params.id);

  res.json({ message: "Order cancelled" });
});

module.exports = router;
