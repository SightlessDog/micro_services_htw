"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("../middleware/auth");
const productClient = __importStar(require("../services/productClient"));
const kafka_1 = require("../kafka");
const db_1 = require("../db");
const router = express_1.default.Router();
const VALID_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const asyncHandler = (fn) => (req, res, next) => {
    fn(req, res, next).catch(next);
};
router.get("/", auth_1.authenticate, asyncHandler(async (req, res) => {
    const orders = await db_1.prisma.order.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
    });
    res.json(orders);
}));
router.get("/all", auth_1.authenticate, auth_1.requireAdmin, asyncHandler(async (_req, res) => {
    const orders = await db_1.prisma.order.findMany({
        orderBy: { createdAt: "desc" },
    });
    res.json(orders);
}));
router.get("/:id", auth_1.authenticate, asyncHandler(async (req, res) => {
    const order = await db_1.prisma.order.findUnique({ where: { id: req.params.id } });
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
router.post("/", auth_1.authenticate, async (req, res, next) => {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "items must be a non-empty array" });
        return;
    }
    for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity < 1) {
            res.status(400).json({ error: "Each item needs product_id and quantity >= 1" });
            return;
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
        const order = await db_1.prisma.order.create({
            data: {
                userId: req.user.id,
                items: enrichedItems,
                total,
                status: "pending",
            },
        });
        res.status(201).json(order);
        (0, kafka_1.publishOrderPlaced)(order, req.user.email).catch((err) => console.error("Failed to publish order.placed:", order.id, err.message));
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err) && err.response?.status === 404) {
            const data = err.response.data;
            res.status(404).json({ error: data?.error || err.message });
            return;
        }
        next(err);
    }
});
router.patch("/:id/status", auth_1.authenticate, asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
        return;
    }
    const order = await db_1.prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    if (order.userId !== req.user.id && !req.user.isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const updated = await db_1.prisma.order.update({
        where: { id: req.params.id },
        data: { status },
    });
    res.json(updated);
}));
router.delete("/:id", auth_1.authenticate, asyncHandler(async (req, res) => {
    const order = await db_1.prisma.order.findUnique({ where: { id: req.params.id } });
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
    const cancelled = await db_1.prisma.order.update({
        where: { id: req.params.id },
        data: { status: "cancelled" },
    });
    res.json({ message: "Order cancelled" });
    (0, kafka_1.publishOrderCancelled)(cancelled, req.user.email).catch((err) => console.error("Failed to publish order.cancelled:", cancelled.id, err.message));
}));
exports.default = router;
//# sourceMappingURL=orders.js.map