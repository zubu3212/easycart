// npm run db:start -> only starts the built-in PostgreSQL and keeps it running (useful for `npm run studio`).
import "dotenv/config";
import { startEmbeddedDb } from "../lib/embeddedDb.js";

try {
  const db = await startEmbeddedDb();
  console.log("Built-in PostgreSQL is running. Press Ctrl+C to stop it.");
  const stop = async () => { await db.stop().catch(() => {}); process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 1 << 30);
} catch (e) { console.error("\n" + e.message); process.exit(1); }
