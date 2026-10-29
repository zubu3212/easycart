// npm run dev -> starts the built-in PostgreSQL (if EMBEDDED_DB=true) and then the API server with auto-reload.
import "dotenv/config";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { startEmbeddedDb } from "../lib/embeddedDb.js";

let db = null;
if (process.env.EMBEDDED_DB === "true") {
  try {
    console.log("Starting built-in PostgreSQL...");
    db = await startEmbeddedDb();
    console.log("Built-in PostgreSQL is ready.");
  } catch (e) { console.error("\n" + e.message); process.exit(1); }
}

const tsx = createRequire(import.meta.url).resolve("tsx/cli");
const child = spawn(process.execPath, [tsx, "watch", "server.js"], { stdio: "inherit" });

let closing = false;
const shutdown = async (code = 0) => {
  if (closing) return;
  closing = true;
  child.kill();
  if (db) await db.stop().catch(() => {});
  process.exit(code);
};
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
child.on("exit", (code) => shutdown(code ?? 0));
