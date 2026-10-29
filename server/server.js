import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";
import { demoCardEnabled } from "./lib/config.js";
import { rateLimit } from "./middleware/rateLimit.js";
import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/categories.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";

const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL || !!process.env.NETLIFY;

// ---- Fail early with a clear message instead of a mysterious 500 later ----
// (On Netlify a missing JWT_SECRET is fine: netlify.js generates one and keeps it in the database.)
const secret = process.env.JWT_SECRET;
if (!secret && !process.env.NETLIFY) throw new Error("JWT_SECRET is missing. Set it in server/.env (or in the Vercel environment variables).");
if (secret && isProd && (secret === "change_this_secret" || secret.length < 32))
  throw new Error("JWT_SECRET is too weak for production. Use a random string of 32+ characters.");

const origins = (process.env.CLIENT_URL || "").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
if (isProd && origins.length === 0)
  console.warn("CLIENT_URL is not set: browsers on other domains will be blocked by CORS (same-site requests still work).");

const app = express();
if (process.env.VERCEL) app.set("trust proxy", 1); // real client IP behind Vercel (rate limiting)
// Local dev: allow any origin. Production: only CLIENT_URL (nobody if it is empty).
app.use(cors({ origin: origins.length ? origins : isProd ? false : true }));
app.use(express.json({ limit: "50kb" }));

app.get("/", (req, res) => res.send("EasyCart API running (PostgreSQL + Prisma 7)"));
app.get("/api/config", (req, res) => res.json({ demoCard: demoCardEnabled() }));

app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many login attempts, try again in 15 minutes" }));
app.use("/api/auth/register", rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: "Too many sign-ups from this network, try again later" }));
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON in request" });
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Request too large" });
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

// Local only: Vercel and Netlify run the exported app themselves.
// (No top-level await here, because Vercel may compile this file to CommonJS.)
if (!process.env.VERCEL && !process.env.NETLIFY) {
  const PORT = process.env.PORT || 5000;
  prisma
    .$connect()
    .then(() => {
      console.log("PostgreSQL connected");
      app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    })
    .catch((e) => {
      console.error("Database connection failed:", e.message);
      console.error("Check DATABASE_URL in server/.env and that PostgreSQL is running.");
      process.exit(1);
    });
}

export default app;
