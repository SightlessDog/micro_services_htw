import express, { type Request, type Response, type NextFunction } from "express";
import axios from "axios";
import { Prisma } from "@prisma/client";
import { authenticate, requireAdmin } from "../middleware/auth";
import * as productClient from "../services/productClient";
import { publishOrderPlaced, publishOrderCancelled } from "../kafka";
import { prisma } from "../db";

const router = express.Router();

const VALID_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

interface OrderItemInput {
  product_id: number;
  quantity: number;
}

interface EnrichedOrderItem {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

function isValidOrderItem(value: unknown): value is OrderItemInput {
  if (typeof value !== "object" || value === null) return false;
  const { product_id, quantity } = value as Record<string, unknown>;
  return (
    typeof product_id === "number" &&
    Number.isInteger(product_id) &&
    product_id > 0 &&
    typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity >= 1
  );
}

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (fn: AsyncRouteHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
}));

router.get("/all", authenticate, requireAdmin, asyncHandler(async (_req, res) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
}));

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.userId !== req.user.id && !req.user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(order);
}));

router.post("/", authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const items = req.body.items as unknown;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items must be a non-empty array" });
    return;
  }

  if (!items.every(isValidOrderItem)) {
    res.status(400).json({ error: "Each item needs an integer product_id and an integer quantity >= 1" });
    return;
  }

  try {
    const enrichedItems: EnrichedOrderItem[] = await Promise.all(
      items.map(async (item) => {
        const product = await productClient.getProduct(item.product_id);
        return {
          product_id: product.id,
          name: product.name,
          quantity: item.quantity,
          unit_price: product.price,
          subtotal: product.price * item.quantity,
        };
      }),
    );
    const total = enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        items: enrichedItems as unknown as Prisma.InputJsonValue,
        total,
        status: "pending",
      },
    });

    res.status(201).json(order);

    publishOrderPlaced(order, req.user.email).catch((err: Error) =>
      console.error("Failed to publish order.placed:", order.id, err.message),
    );
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      const data = err.response.data as { error?: string } | undefined;
      res.status(404).json({ error: data?.error || err.message });
      return;
    }
    next(err);
  }
});

router.patch("/:id/status", authenticate, asyncHandler(async (req, res) => {
  const { status } = req.body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status as OrderStatus)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.userId !== req.user.id && !req.user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(updated);
}));

router.delete("/:id", authenticate, asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.userId !== req.user.id && !req.user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (order.status !== "pending") {
    res.status(409).json({ error: "Only pending orders can be cancelled" });
    return;
  }

  const cancelled = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "cancelled" },
  });

  res.json({ message: "Order cancelled" });

  publishOrderCancelled(cancelled, req.user.email).catch((err: Error) =>
    console.error("Failed to publish order.cancelled:", cancelled.id, err.message),
  );
}));

export default router;
