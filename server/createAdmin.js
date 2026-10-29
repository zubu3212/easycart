// npm run admin -> checks for an admin, creates one if missing. Deletes nothing.
// Password: set ADMIN_PASSWORD in .env, otherwise a random one is generated and printed ONCE.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma.js";

const admin = await prisma.user.findFirst({ where: { role: "admin" } });
if (admin) {
  console.log("Admin already exists:", admin.email);
} else {
  const email = (process.env.ADMIN_EMAIL || "admin@easycart.com").trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { role: "admin" } });
    console.log("Existing user promoted to admin:", email);
  } else {
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
    await prisma.user.create({ data: { name: "Admin", email, password: await bcrypt.hash(password, 10), role: "admin" } });
    console.log(`Admin created: ${email} / ${password}`);
    if (!process.env.ADMIN_PASSWORD) console.log("(random password, save it now, it is not stored anywhere)");
  }
}
await prisma.$disconnect();
