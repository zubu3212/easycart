import { Router } from "express";
import { prisma, httpError, fail } from "../lib/prisma.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();
const withCategory = { category: { select: { id: true, name: true } } };
const MAX_INT = 1_000_000_000;

const SORTS = new Map([
  ["priceAsc", { price: "asc" }],
  ["priceDesc", { price: "desc" }],
]);

const whole = (v, label) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0 || n > MAX_INT) throw httpError(400, `${label} must be a number between 0 and ${MAX_INT}`);
  return n;
};
const limited = (v, max, label) => {
  const s = String(v);
  if (s.length > max) throw httpError(400, `${label} is too long`);
  return s;
};

// Only these fields can be written by the admin form. Pass isCreate=true to require the basics.
const fromBody = (b, isCreate = false) => {
  const d = {};
  if (b.name !== undefined) {
    d.name = limited(b.name, 200, "Name").trim();
    if (!d.name) throw httpError(400, "Name is required");
  }
  if (b.brand !== undefined) d.brand = limited(b.brand, 100, "Brand").trim();
  if (b.image !== undefined) d.image = limited(b.image, 2000, "Image URL").trim();
  if (b.description !== undefined) d.description = limited(b.description, 5000, "Description");
  if (b.price !== undefined) d.price = whole(b.price, "Price");
  if (b.stock !== undefined) d.stock = whole(b.stock, "Stock");
  if (b.category !== undefined) {
    if (typeof b.category !== "string" || !b.category) throw httpError(400, "Please choose a valid category");
    d.categoryId = b.category;
  }
  if (b.specs !== undefined) {
    if (!Array.isArray(b.specs) || b.specs.length > 20) throw httpError(400, "Specs must be a list of up to 20 lines");
    d.specs = b.specs.map((s) => limited(s, 200, "A spec line").trim()).filter(Boolean);
  }
  if (isCreate && (!d.name || d.price === undefined || !d.categoryId))
    throw httpError(400, "Name, price and category are required");
  return d;
};
const dbError = (e) =>
  e.code === "P2003" ? httpError(400, "Please choose a valid category")
  : e.code === "P2025" ? httpError(404, "Product not found")
  : e;

// GET /api/products?search=&category=&sort=&minPrice=&maxPrice=&ids=a,b&limit=&page=
router.get("/", async (req, res) => {
  try {
    const q = (k) => (typeof req.query[k] === "string" ? req.query[k].trim() : "");
    const where = {};

    const search = q("search").slice(0, 100);
    if (search)
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    if (q("category")) where.categoryId = q("category");
    if (q("ids")) where.id = { in: q("ids").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50) };

    const price = {};
    for (const [key, op] of [["minPrice", "gte"], ["maxPrice", "lte"]]) {
      if (!q(key)) continue;
      const n = Number(q(key));
      if (!Number.isFinite(n)) throw httpError(400, `${key} must be a number`);
      price[op] = n;
    }
    if (Object.keys(price).length) where.price = price;

    const limit = Math.min(Math.max(parseInt(q("limit"), 10) || 500, 1), 500);
    const page = Math.max(parseInt(q("page"), 10) || 1, 1);
    const orderBy = SORTS.get(q("sort")) || { createdAt: "desc" };

    res.json(await prisma.product.findMany({ where, orderBy, include: withCategory, take: limit, skip: (page - 1) * limit }));
  } catch (e) { fail(res, e); }
});

router.get("/:id", async (req, res) => {
  try {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: withCategory });
    if (!p) throw httpError(404, "Product not found");
    res.json(p);
  } catch (e) { fail(res, e); }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    res.status(201).json(await prisma.product.create({ data: fromBody(req.body, true), include: withCategory }));
  } catch (e) { fail(res, dbError(e)); }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    res.json(await prisma.product.update({ where: { id: req.params.id }, data: fromBody(req.body), include: withCategory }));
  } catch (e) { fail(res, dbError(e)); }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: "Product deleted" });
  } catch (e) { fail(res, dbError(e)); }
});

export default router;
