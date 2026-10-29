// Small in-memory rate limiter (no extra package).
// On Vercel every serverless instance keeps its own counter, so this slows abuse down
// but is not a hard guarantee. For strict limits use a shared store (Upstash/Redis).
export function rateLimit({ windowMs, max, message = "Too many attempts, please try again later" }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs);
  timer.unref?.();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.headers["x-nf-client-connection-ip"] || req.ip || "unknown"; // Netlify sends the real client IP
    let h = hits.get(key);
    if (!h || h.reset <= now) {
      h = { count: 0, reset: now + windowMs };
      hits.set(key, h);
    }
    if (++h.count > max) {
      res.set("Retry-After", String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ message });
    }
    next();
  };
}
