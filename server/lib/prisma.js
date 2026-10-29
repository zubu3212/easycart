import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getConnectionString } from "@netlify/database";

const serverless = !!(process.env.VERCEL || process.env.NETLIFY);

// Local/own Postgres: DATABASE_URL. On Netlify the managed Netlify Database URL is used instead.
const connectionString = process.env.DATABASE_URL || getConnectionString();

// Prisma 7 needs a driver adapter. One client for the whole process.
const adapter = new PrismaPg({ connectionString, max: serverless ? 1 : 10 });
export const prisma = new PrismaClient({ adapter });

export const httpError = (status, message) => Object.assign(new Error(message), { status });
export const fail = (res, e) => res.status(e.status || 500).json({ message: e.status ? e.message : "Server error: " + e.message });
