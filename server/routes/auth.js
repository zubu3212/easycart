import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma, httpError, fail } from "../lib/prisma.js";
import { protect } from "../middleware/auth.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10); // keeps login timing equal for unknown emails
const text = (v) => (typeof v === "string" ? v.trim() : "");
const checkPassword = (p) => {
  if (typeof p !== "string" || p.length < 6) throw httpError(400, "Password must be at least 6 characters");
  if (p.length > 72) throw httpError(400, "Password must be 72 characters or fewer");
};

const send = (res, u, code = 200) =>
  res.status(code).json({
    id: u.id, name: u.name, email: u.email, phone: u.phone, address: u.address, role: u.role,
    token: jwt.sign({ id: u.id }, process.env.JWT_SECRET, { expiresIn: "7d", algorithm: "HS256" }),
  });

router.post("/register", async (req, res) => {
  try {
    const name = text(req.body.name);
    const email = text(req.body.email).toLowerCase();
    const password = req.body.password;
    if (!name || !email || !password) throw httpError(400, "All fields are required");
    if (name.length > 100) throw httpError(400, "Name is too long");
    if (email.length > 254 || !EMAIL_RE.test(email)) throw httpError(400, "Enter a valid email address");
    checkPassword(password);
    try {
      const user = await prisma.user.create({ data: { name, email, password: await bcrypt.hash(password, 10) } });
      send(res, user, 201);
    } catch (e) {
      if (e.code === "P2002") throw httpError(400, "This email is already registered");
      throw e;
    }
  } catch (e) { fail(res, e); }
});

router.post("/login", async (req, res) => {
  try {
    const email = text(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    const ok = await bcrypt.compare(password, user?.password || DUMMY_HASH);
    if (!user || !ok) throw httpError(401, "Wrong email or password");
    send(res, user);
  } catch (e) { fail(res, e); }
});

router.get("/profile", protect, (req, res) => res.json(req.user));

router.put("/profile", protect, async (req, res) => {
  try {
    const data = {};
    if (req.body.name !== undefined) {
      const name = text(req.body.name);
      if (!name) throw httpError(400, "Name cannot be empty");
      if (name.length > 100) throw httpError(400, "Name is too long");
      data.name = name;
    }
    if (req.body.phone !== undefined) {
      const phone = text(req.body.phone);
      if (phone.length > 30) throw httpError(400, "Phone number is too long");
      data.phone = phone;
    }
    if (req.body.address !== undefined) {
      const address = text(req.body.address);
      if (address.length > 500) throw httpError(400, "Address is too long");
      data.address = address;
    }
    if (req.body.password) {
      checkPassword(req.body.password);
      data.password = await bcrypt.hash(req.body.password, 10);
    }
    send(res, await prisma.user.update({ where: { id: req.user.id }, data }));
  } catch (e) { fail(res, e); }
});

export default router;
