import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: the database URL lives here, not in schema.prisma.
// It may be empty on Netlify builds: `prisma generate` does not need it, and the app uses Netlify Database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
