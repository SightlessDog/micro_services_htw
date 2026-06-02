const express = require("express");
const { authenticate } = require("../middleware/auth");
const productClient = require("../services/productClient");
const { publishOrderPlaced, publishOrderCancelled } = require("../kafka");
const { prisma } = require("../db");

const router = express.Router();

const VALID_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
}));

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  res.json(order);
}));

router.post("/", authenticate, async (req, res, next) => {
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

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        items: enrichedItems,
        total,
        status: "pending",
      },
    });

    res.status(201).json(order);

    publishOrderPlaced(order, req.user.email).catch(err =>
      console.error("Failed to publish order.placed:", order.id, err.message),
    );
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: err.response.data?.error || err.message });
    }
    next(err);
  }
});

router.patch("/:id/status", authenticate, asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(updated);
}));

router.delete("/:id", authenticate, asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  if (order.status !== "pending") {
    return res.status(409).json({ error: "Only pending orders can be cancelled" });
  }

  const cancelled = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "cancelled" },
  });

  res.json({ message: "Order cancelled" });

  publishOrderCancelled(cancelled, req.user.email).catch(err =>
    console.error("Failed to publish order.cancelled:", cancelled.id, err.message),
  );
}));

module.exports = router;
