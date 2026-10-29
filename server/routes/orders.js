import { Router } from "express";
import { prisma, httpError, fail } from "../lib/prisma.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { demoCardEnabled } from "../lib/config.js";

const router = Router();
const STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

// Allowed status moves. Delivered and Cancelled are final, so stock can never get out of sync
// (for example: cancel -> restock -> "un-cancel" without taking the stock again).
const NEXT = {
  Pending: ["Processing", "Shipped", "Delivered", "Cancelled"],
  Processing: ["Shipped", "Delivered", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Place an order. Prices come from the database, and stock is reduced inside one
// transaction, so two buyers can never both take the last item.
router.post("/", protect, async (req, res) => {
  try {
    const { items, shipping, paymentMethod = "cod" } = req.body;
    if (!Array.isArray(items) || !items.length) throw httpError(400, "Your cart is empty");
    if (items.length > 50) throw httpError(400, "Too many different products in one order (max 50)");

    const ship = { name: clean(shipping?.name, 100), phone: clean(shipping?.phone, 30), address: clean(shipping?.address, 500) };
    if (!ship.name || !ship.phone || !ship.address) throw httpError(400, "Please fill in all shipping details");
    if (ship.phone.length < 6) throw httpError(400, "Please enter a valid phone number");

    if (paymentMethod !== "cod" && paymentMethod !== "card") throw httpError(400, "Invalid payment method");
    if (paymentMethod === "card" && !demoCardEnabled())
      throw httpError(400, "Online card payment is not available yet. Please choose cash on delivery.");

    // Merge duplicate lines and validate quantities
    const wanted = new Map();
    for (const it of items) {
      const qty = Number(it?.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 1000) throw httpError(400, "Invalid quantity");
      const id = String(it?.product ?? "");
      wanted.set(id, (wanted.get(id) || 0) + qty);
    }

    const order = await prisma.$transaction(
      async (tx) => {
        let total = 0;
        const orderItems = [];
        for (const [id, qty] of [...wanted].sort(([a], [b]) => (a < b ? -1 : 1))) { // stable order avoids deadlocks
          const p = await tx.product.findUnique({ where: { id } });
          if (!p) throw httpError(400, "A product in your cart no longer exists");
          const r = await tx.product.updateMany({ where: { id: p.id, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
          if (r.count === 0) {
            const now = await tx.product.findUnique({ where: { id }, select: { stock: true } });
            throw httpError(400, now?.stock ? `Only ${now.stock} left of ${p.name}` : `${p.name} is out of stock`);
          }
          orderItems.push({ productId: p.id, name: p.name, image: p.image, price: p.price, qty });
          total += p.price * qty;
        }
        const card = paymentMethod === "card";
        return tx.order.create({
          data: {
            userId: req.user.id,
            total,
            shipping: ship,
            paymentMethod: card ? "card" : "cod",
            isPaid: card, // only reachable when DEMO_CARD_PAYMENTS=true (see README for Stripe)
            items: { create: orderItems },
          },
          include: { items: true },
        });
      },
      { maxWait: 10000, timeout: 20000 }
    );
    res.status(201).json(order);
  } catch (e) { fail(res, e); }
});

router.get("/mine", protect, async (req, res) => {
  try {
    res.json(await prisma.order.findMany({ where: { userId: req.user.id }, include: { items: true }, orderBy: { createdAt: "desc" } }));
  } catch (e) { fail(res, e); }
});

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    res.json(await prisma.order.findMany({
      include: { items: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }));
  } catch (e) { fail(res, e); }
});

router.put("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const status = req.body.status;
    if (!STATUSES.includes(status)) throw httpError(400, "Invalid status");
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!order) throw httpError(404, "Order not found");
      if (status === order.status) return order;
      if (!NEXT[order.status].includes(status))
        throw httpError(400, `An order that is ${order.status} cannot be changed to ${status}`);

      // Conditional update: if another admin changed it a moment ago, nothing is written (no double restock)
      const r = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status, ...(status === "Delivered" && { isPaid: true }) },
      });
      if (r.count === 0) throw httpError(409, "This order was just changed by someone else. Refresh and try again.");

      if (status === "Cancelled")
        for (const it of order.items)
          if (it.productId) await tx.product.updateMany({ where: { id: it.productId }, data: { stock: { increment: it.qty } } });

      return tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
    });
    res.json(updated);
  } catch (e) { fail(res, e); }
});

export default router;
