// Netlify entry: runs the Express app as a Netlify Function (see server/netlify/functions/api.mjs).
import crypto from "node:crypto";
import serverless from "serverless-http";
import bcrypt from "bcryptjs";
import app from "./server.js";
import { prisma } from "./lib/prisma.js";

// JWT_SECRET from the environment wins. Otherwise a random one is created once and kept in the database,
// so the site works without any setup and logins survive new deploys and cold starts.
const loadJwtSecret = async () => {
  if (process.env.JWT_SECRET) return;
  const value = crypto.randomBytes(32).toString("hex");
  await prisma.appSecret.createMany({ data: [{ name: "JWT_SECRET", value }], skipDuplicates: true });
  process.env.JWT_SECRET = (await prisma.appSecret.findUnique({ where: { name: "JWT_SECRET" } })).value;
};

// First start on a fresh database: create the admin from ADMIN_EMAIL / ADMIN_PASSWORD (if set).
// Never overwrites anything; once an admin exists this does nothing.
const ensureAdmin = async () => {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || (await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } }))) return;
  const email = (process.env.ADMIN_EMAIL || "admin@easycart.com").trim().toLowerCase();
  // An existing account with that email is NOT promoted (anyone could have registered it).
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } }))
    return console.error(`Admin not created: ${email} is already registered as a customer. Set a different ADMIN_EMAIL.`);
  await prisma.user.create({ data: { name: "Admin", email, password: await bcrypt.hash(password, 10), role: "admin" } });
  console.log("Admin account created:", email);
};

const run = serverless(app);
let ready = null;

export const handler = async (event, context) => {
  ready ??= Promise.all([
    loadJwtSecret(),
    ensureAdmin().catch((e) => console.error("Admin setup failed:", e.message)),
  ]).catch((e) => { ready = null; throw e; }); // retry on the next request if the database was unreachable
  await ready;
  return run(event, context);
};
