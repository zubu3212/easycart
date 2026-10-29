import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export const protect = async (req, res, next) => {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ message: "Please log in" });

  // 1) Token problems -> 401 (client logs the user out)
  let id;
  try {
    ({ id } = jwt.verify(h.split(" ")[1], process.env.JWT_SECRET, { algorithms: ["HS256"] }));
  } catch {
    return res.status(401).json({ message: "Session expired, please log in again" });
  }

  // 2) Database problems -> 503 (user stays logged in and can retry)
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, address: true, role: true },
    });
    if (!user) return res.status(401).json({ message: "User not found, please log in again" });
    req.user = user;
    next();
  } catch (e) {
    console.error("Auth DB error:", e.message);
    res.status(503).json({ message: "Server is busy, please try again in a moment" });
  }
};

export const adminOnly = (req, res, next) =>
  req.user?.role === "admin" ? next() : res.status(403).json({ message: "Admin access only" });
