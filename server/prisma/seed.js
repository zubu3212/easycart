// npm run seed        -> SAFE: adds whatever is missing (admin, categories, sample products with pictures). Deletes nothing.
// npm run seed:reset  -> wipes ALL data first, then loads the sample data (blocked on non-local databases).
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const RESET = process.argv.includes("--reset");
let host = "";
try { host = new URL(process.env.DATABASE_URL).hostname; } catch {}
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);

if (RESET && !isLocal && process.env.SEED_ALLOW_RESET !== "yes") {
  console.error(`Refusing to wipe a non-local database (${host}). Set SEED_ALLOW_RESET=yes if you really mean it.`);
  process.exit(1);
}

if (RESET) {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log("All data deleted.");
}

// ---- Users ----
// Admin password: ADMIN_PASSWORD from .env; local default admin123; on a remote DB a random one is generated.
const adminEmail = (process.env.ADMIN_EMAIL || "admin@easycart.com").trim().toLowerCase();
let adminPassword = process.env.ADMIN_PASSWORD || (isLocal ? "admin123" : crypto.randomBytes(9).toString("base64url"));
let note = "";
if (!(await prisma.user.findUnique({ where: { email: adminEmail } }))) {
  await prisma.user.create({ data: { name: "Admin", email: adminEmail, password: await bcrypt.hash(adminPassword, 10), role: "admin" } });
  note += `Admin created: ${adminEmail} / ${adminPassword}\n`;
  if (!process.env.ADMIN_PASSWORD && !isLocal) note += "(random password, save it now and change it after first login)\n";
} else note += `Admin ${adminEmail} already exists (password unchanged).\n`;

// The demo customer is only created on a local database
if (isLocal && !(await prisma.user.findUnique({ where: { email: "user@easycart.com" } }))) {
  await prisma.user.create({ data: { name: "Demo Customer", email: "user@easycart.com", password: await bcrypt.hash("user123", 10) } });
  note += "Demo customer: user@easycart.com / user123\n";
}

// ---- Categories ----
const cats = {};
for (const name of ["Smartphones", "Laptops", "Headphones", "Smartwatches", "Computer Components"]) {
  const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  cats[name] = c.id;
}

// ---- Products (pictures live in client/public/products and are served by the frontend) ----
const items = [
  ["Nova X12 Smartphone", "Smartphones", 54999, "Nova", 25, ['6.7" AMOLED 120Hz', "8GB RAM / 256GB", "5000mAh battery"], "nova-x12.svg"],
  ["Pixelite 9 5G", "Smartphones", 42999, "Pixelite", 18, ['6.4" OLED', "12GB RAM / 256GB", "50MP camera"], "pixelite-9.svg"],
  ["AeroBook 14 Laptop", "Laptops", 89999, "Aero", 10, ["Core i5 13th Gen", "16GB RAM / 512GB SSD", '14" FHD IPS'], "aerobook-14.svg"],
  ["Forge G5 Gaming Laptop", "Laptops", 139999, "Forge", 6, ["Ryzen 7", "RTX 4060 8GB", "165Hz display"], "forge-g5.svg"],
  ["Pulse ANC Headphones", "Headphones", 8999, "Pulse", 40, ["Active noise cancelling", "40h battery", "Bluetooth 5.3"], "pulse-anc.svg"],
  ["Buds Mini Wireless", "Headphones", 2999, "Pulse", 60, ["Touch controls", "24h with case", "IPX4"], "buds-mini.svg"],
  ["Tempo Watch S2", "Smartwatches", 7499, "Tempo", 30, ['1.8" AMOLED', "GPS + heart rate", "7 day battery"], "tempo-watch-s2.svg"],
  ["Tempo Fit Band", "Smartwatches", 2499, "Tempo", 4, ["SpO2 tracking", "14 day battery", "Water resistant"], "tempo-fit-band.svg"],
  ["Ryzen 5 5600 Processor", "Computer Components", 14999, "AMD", 15, ["6 cores / 12 threads", "AM4 socket", "Up to 4.4GHz"], "ryzen-5-5600.svg"],
  ["Nitro 16GB DDR4 RAM", "Computer Components", 4299, "Nitro", 50, ["3200MHz", "CL16", "Heat spreader"], "nitro-ddr4.svg"],
  ["Vault 1TB NVMe SSD", "Computer Components", 6499, "Vault", 35, ["PCIe 4.0", "7000MB/s read", "5 year warranty"], "vault-nvme.svg"],
];

let added = 0, pictures = 0;
for (const [name, c, price, brand, stock, specs, file] of items) {
  const image = `/products/${file}`;
  const existing = await prisma.product.findFirst({ where: { name } });
  if (!existing) {
    await prisma.product.create({
      data: {
        name, price, brand, stock, specs, image, categoryId: cats[c],
        description: `${name} from ${brand}. Genuine product with official warranty and fast delivery.`,
      },
    });
    added++;
  } else if (!existing.image || existing.image.startsWith("https://placehold.co") || existing.image.startsWith("/products/")) {
    // old grey placeholder (or an earlier seeded picture) -> real picture. Custom admin images are left alone.
    if (existing.image !== image) { await prisma.product.update({ where: { id: existing.id }, data: { image } }); pictures++; }
  }
}

console.log(`Seed done. ${added} product(s) added, ${pictures} picture(s) updated.`);
console.log(note.trim());
await prisma.$disconnect();
