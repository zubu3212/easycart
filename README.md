# EasyCart: Electronics E-Commerce

React + Tailwind (client), Node + Express (server), PostgreSQL + Prisma ORM 7 (database).

## Quick start (no PostgreSQL install needed)
Requirement: Node.js 20.19 or newer. A real PostgreSQL database is built in and runs from `node_modules`.

```bash
# terminal 1: backend
cd server
npm install
npm run setup        # first time only: starts the built-in database, creates tables, loads sample data + pictures
npm run dev          # starts the database AND the API on http://localhost:5000
```
```bash
# terminal 2: frontend
cd client
npm install
npm run dev          # http://localhost:5173
```
Next time you only need `npm run dev` in both folders. Your data is kept in `server/.pgdata`
(delete that folder and run `npm run setup` to start again from zero).

Notes: on Windows do not run VS Code as Administrator (PostgreSQL refuses to start as admin). The built-in database uses
port 5433; if that is taken, change the port in `DATABASE_URL`.

### Using your own PostgreSQL instead
Install PostgreSQL (or use Neon/Supabase), create a database `easycart`, then in `server/.env` set
`DATABASE_URL` to its URL and `EMBEDDED_DB=false`. First run: `npm run setup`, then `npm run dev`.

Logins after seeding on a **local** database:
- Admin: admin@easycart.com / admin123
- Customer: user@easycart.com / user123

On a **remote** database (Neon etc.) the seed does not create the demo customer, and the admin gets
the password from `ADMIN_PASSWORD` (or a random one printed once in the terminal).

## Product pictures
Every sample product has its own picture in `client/public/products/*.svg` (served by the frontend,
stored in the database as `/products/<file>.svg`). Running `npm run seed` again updates old grey
placeholder images to these pictures without touching anything else. For your own products use any
image URL in the admin form, or drop a file into `client/public/products/` and enter `/products/your-file.jpg`.
If a picture fails to load, a neutral placeholder is shown.

## Useful commands (server)
| Command | What it does |
|---|---|
| `npm run admin` | Checks for an admin, creates one if missing. Deletes nothing |
| `npm run setup` | First-time setup: built-in database + Prisma client + tables + sample data |
| `npm run db:start` | Only starts the built-in database (for `npm run studio`) |
| `npm run dev:server` | API only, without the built-in database (when you use your own PostgreSQL) |
| `npm run seed` | SAFE: adds whatever is missing and fixes pictures. Deletes nothing |
| `npm run seed:reset` | Wipes ALL data, then loads sample data. Refuses to run on a non-local database |
| `npm run studio` | Opens Prisma Studio to browse the tables |
| `npm run db:migrate` | After you edit `prisma/schema.prisma`, create a new migration |
| `npm run db:generate` | Regenerate the Prisma client (needed after pulling schema changes) |

## Environment variables (server)
| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `EMBEDDED_DB` | `true` = start the built-in PostgreSQL with `npm run dev` / `npm run setup` (local only). `false` for your own or hosted database |
| `JWT_SECRET` | Required. In production it must be 32+ random characters (`openssl rand -hex 32`); the server refuses to start otherwise |
| `CLIENT_URL` | Production: your frontend URL(s), comma separated. If empty in production, other domains are blocked by CORS |
| `DEMO_CARD_PAYMENTS` | `true` shows the demo "pay by card" option (marks the order paid WITHOUT charging). Leave `false` on a live site |
| `ADMIN_PASSWORD` / `ADMIN_EMAIL` | Optional, used by `seed` and `admin` when creating the admin account |

## Prisma 7 notes
- Database URL is in `prisma.config.ts` (not in the schema file).
- The client is generated into `node_modules/@prisma/client` (`prisma-client-js` generator, so Vercel bundles it correctly) and uses the `pg` driver adapter (`lib/prisma.js`).
- Prisma 7 no longer runs `generate` automatically after `migrate`, so run `npm run db:generate` yourself when needed.

## Features
Customer: register/login (JWT), categories, search + sort, product details, cart,
checkout (cash on delivery, optional demo card), profile and order history.
The cart re-checks price and stock with the server each time you open the cart or checkout.

Admin (/admin): dashboard stats, product add/edit/delete, category management,
order status, stock control (quick +/- and low-stock list). Stock is reduced inside a
database transaction when an order is placed and restored if the order is cancelled.
Order status can only move forward (Pending > Processing > Shipped > Delivered) or to Cancelled;
Delivered and Cancelled are final, so stock can never get out of sync.

## Security built in
- Prices always come from the database, never from the browser.
- Login/sign-up rate limiting (in memory; on Vercel each instance counts separately, use Redis/Upstash for strict limits).
- Expired or invalid login is detected and the user is logged out automatically.
- Input type/length checks on all write endpoints.

## Payment note
"Pay now by card" is a demo and is OFF unless `DEMO_CARD_PAYMENTS=true`: no card data is sent and no money moves.
For real payments add Stripe in `server/routes/orders.js` and on the Checkout page.

## Deploy on Vercel

Three parts: database (Neon), backend (Vercel project 1), frontend (Vercel project 2).

1. **Database:** create a free Postgres on Neon (or Vercel Storage > Neon). Copy BOTH connection strings:
   the *direct* one (for migrations) and the *pooled* one (for the running app).
2. **Create tables + data (from your PC):** put the **direct** Neon URL in `server/.env` as `DATABASE_URL`, then
   `cd server && npm run db:deploy && ADMIN_PASSWORD=choose-a-strong-one npm run seed`
   (on Windows PowerShell: `$env:ADMIN_PASSWORD="choose-a-strong-one"; npm run seed`). Put your local URL back afterwards.
   Migrations through the pooled URL can hang, so use the direct one here.
3. **Push the project to GitHub** (`.env` and `generated/` are git-ignored). Make sure `server/prisma/migrations` is committed.
4. **Backend:** Vercel > Add New Project > import the repo > Root Directory `server`.
   Environment variables: `DATABASE_URL` (Neon **pooled**), `JWT_SECRET` (32+ random chars), `CLIENT_URL` (add after step 5).
   Leave `DEMO_CARD_PAYMENTS` unset.
5. **Frontend:** Add New Project > same repo > Root Directory `client` > Framework Vite.
   Environment variable: `VITE_API_URL` = `https://YOUR-BACKEND.vercel.app/api`
   (set it BEFORE the first build; if you add it later, Redeploy).
6. Go back to the backend project, set `CLIENT_URL` to the frontend URL (no trailing slash needed), then Redeploy.
7. Log in as admin and change the admin password.
