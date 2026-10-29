// Built-in PostgreSQL for local development: no separate PostgreSQL install needed.
// It runs real PostgreSQL from node_modules (package "embedded-postgres") and keeps the data in server/.pgdata.
// Host, port, user, password and database name are taken from DATABASE_URL in .env.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".pgdata");

function readConfig() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing in server/.env");
  const u = new URL(process.env.DATABASE_URL);
  if (!["localhost", "127.0.0.1", "::1"].includes(u.hostname))
    throw new Error(`EMBEDDED_DB=true only works with a local DATABASE_URL (localhost), but it points to ${u.hostname}. Set EMBEDDED_DB=false to use that database.`);
  return {
    user: decodeURIComponent(u.username || "postgres"),
    password: decodeURIComponent(u.password || "postgres"),
    port: Number(u.port || 5432),
    database: decodeURIComponent(u.pathname.slice(1) || "easycart"),
  };
}

const client = (cfg, database = "postgres") =>
  new pg.Client({ host: "localhost", port: cfg.port, user: cfg.user, password: cfg.password, database, connectionTimeoutMillis: 2000 });

async function reachable(cfg) {
  const c = client(cfg);
  try { await c.connect(); return true; } catch { return false; } finally { await c.end().catch(() => {}); }
}

async function ensureDatabase(cfg) {
  const c = client(cfg);
  await c.connect();
  try {
    const { rowCount } = await c.query("SELECT 1 FROM pg_database WHERE datname = $1", [cfg.database]);
    if (!rowCount) await c.query(`CREATE DATABASE "${cfg.database.replace(/"/g, '""')}"`);
  } finally { await c.end(); }
}

export async function startEmbeddedDb() {
  const cfg = readConfig();

  // Already running (for example started by another terminal)? Just reuse it.
  if (await reachable(cfg)) {
    await ensureDatabase(cfg);
    return { stop: async () => {} };
  }

  let EmbeddedPostgres;
  try { ({ default: EmbeddedPostgres } = await import("embedded-postgres")); }
  catch { throw new Error("The built-in database package is missing. Run: npm install"); }

  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: cfg.user,
    password: cfg.password,
    port: cfg.port,
    persistent: true,
    onLog: () => {},
    onError: (e) => { if (process.env.DEBUG_DB) console.error(e); },
  });

  try {
    if (!fs.existsSync(path.join(dataDir, "PG_VERSION"))) {
      console.log("First run: creating the built-in database (takes a few seconds)...");
      await server.initialise();
    }
    await server.start();
    await ensureDatabase(cfg);
  } catch (e) {
    throw new Error(
      `Could not start the built-in PostgreSQL on port ${cfg.port}: ${e.message}\n` +
      `- Port ${cfg.port} may be used by another program: change the port in DATABASE_URL.\n` +
      `- On Windows do not run VS Code "as Administrator" (PostgreSQL refuses to start as admin).\n` +
      `- If the folder server/.pgdata is damaged, close everything, delete it and run: npm run setup`
    );
  }
  return { stop: () => server.stop() };
}
