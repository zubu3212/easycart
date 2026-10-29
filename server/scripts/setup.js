// npm run setup -> one command for the first run:
// start built-in PostgreSQL (if EMBEDDED_DB=true), generate Prisma client, create tables, load sample data.
import "dotenv/config";
import { execSync } from "node:child_process";
import { startEmbeddedDb } from "../lib/embeddedDb.js";

const run = (cmd) => { console.log(`\n> ${cmd}`); execSync(cmd, { stdio: "inherit" }); };

let db = null;
try {
  if (process.env.EMBEDDED_DB === "true") {
    console.log("Starting built-in PostgreSQL...");
    db = await startEmbeddedDb();
  }
  run("npx prisma generate");
  run("npx prisma migrate deploy");
  run("npx tsx prisma/seed.js");
  console.log("\nSetup finished. Now run: npm run dev");
} catch (e) {
  console.error("\nSetup failed: " + e.message);
  process.exitCode = 1;
} finally {
  if (db) await db.stop().catch(() => {});
}
