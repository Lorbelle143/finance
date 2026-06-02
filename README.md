# Inventory Financial System

A full-stack inventory and financial management app. Track your balance, manage stock, record transactions, and view charts — all per-user with JWT auth.

---

## Tech Stack

| Layer    | Tech                                        |
|----------|---------------------------------------------|
| Backend  | Node.js, Express, TypeScript, Vercel        |
| Database | PostgreSQL via Neon + Prisma ORM            |
| Auth     | JWT (15 min) + Refresh tokens (30 days)     |
| Frontend | React 18, TypeScript, Vite, Vercel          |
| Charts   | Recharts                                    |

---

## Local Development

### 1. Install backend dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
copy .env.example .env
```

For local dev the default `.env` is fine:

```
DATABASE_URL="file:./prisma/dev.db"
PORT=4000
JWT_SECRET="change-me-to-a-long-random-secret"
NODE_ENV="development"
```

> Note: local dev uses SQLite. Production uses PostgreSQL (Neon).

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Start the backend

```bash
npm run dev
```

Backend runs on **http://localhost:4000**

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173** — Vite proxies `/api` to `localhost:4000` automatically.

---

## Deploying to Vercel + Neon

The backend and frontend are **two separate Vercel projects**.

---

### Step 1 — Set up Neon PostgreSQL

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project (e.g. `inventory-fin`)
3. Go to **Connection Details** and copy:
   - **Pooled connection string** → this is your `DATABASE_URL`
   - **Direct connection string** → this is your `DIRECT_URL`

They look like:
```
postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

---

### Step 2 — Run migrations against Neon

Set the env vars temporarily and push the schema:

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
$env:DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

npx prisma migrate deploy
```

Or on Mac/Linux:
```bash
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npx prisma migrate deploy
```

---

### Step 3 — Deploy the Backend to Vercel

1. Push the entire project to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your repository
4. Set **Root Directory** to `.` (the project root, not `frontend`)
5. Vercel will detect `vercel.json` and use `api/index.ts` as the serverless function
6. Add these **Environment Variables** in Vercel project settings:

| Variable       | Value                                      |
|----------------|--------------------------------------------|
| `DATABASE_URL` | Your Neon **pooled** connection string     |
| `DIRECT_URL`   | Your Neon **direct** connection string     |
| `JWT_SECRET`   | A long random string (min 32 chars)        |
| `NODE_ENV`     | `production`                               |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` (add after frontend is deployed) |

7. Deploy — your backend URL will be `https://your-backend.vercel.app`

---

### Step 4 — Deploy the Frontend to Vercel

1. Go to Vercel → **Add New Project** → same repository
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Add this **Environment Variable**:

| Variable       | Value                                  |
|----------------|----------------------------------------|
| `VITE_API_URL` | `https://your-backend.vercel.app`      |

5. Deploy — your frontend URL will be `https://your-frontend.vercel.app`

---

### Step 5 — Update FRONTEND_URL on the backend

1. Go back to the backend Vercel project → Settings → Environment Variables
2. Update `FRONTEND_URL` to `https://your-frontend.vercel.app`
3. Redeploy the backend (Vercel → Deployments → Redeploy)

---

## Features

| Page        | Features                                                               |
|-------------|------------------------------------------------------------------------|
| Dashboard   | Balance snapshot, inventory summary, cash flow, add transactions       |
| Charts      | Pie chart, bar chart, net cash flow line chart                         |
| Statistics  | Net profit, margin, cash flow trend, top items by value                |
| Earnings    | Full transaction history with search and filter                        |
| Settings    | Update name, change password, logout                                   |

---

## API Endpoints

### Auth (public)
| Method | Path                  | Description          |
|--------|-----------------------|----------------------|
| POST   | /api/auth/register    | Create account       |
| POST   | /api/auth/login       | Login                |
| POST   | /api/auth/refresh     | Refresh access token |
| POST   | /api/auth/logout      | Revoke refresh token |

### Protected (requires `Authorization: Bearer <token>`)
| Method | Path                      | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | /api/me                   | Get current user info                |
| GET    | /api/status               | Balance + inventory summary          |
| GET    | /api/stats                | Full stats for charts/statistics     |
| GET    | /api/items                | List inventory items                 |
| POST   | /api/items                | Create inventory item                |
| PATCH  | /api/items/:id            | Update inventory item                |
| DELETE | /api/items/:id            | Delete inventory item                |
| GET    | /api/transactions         | List transactions (paginated)        |
| POST   | /api/transactions         | Create transaction                   |
| DELETE | /api/transactions/:id     | Delete + reverse transaction         |
| GET    | /api/account              | Get account balance                  |
| PATCH  | /api/account              | Update account balance               |
| PATCH  | /api/profile              | Update display name                  |
| PATCH  | /api/profile/password     | Change password                      |

---

## Project Structure

```
├── api/
│   └── index.ts          # Vercel serverless entry point
├── src/                  # Backend source
│   ├── index.ts          # Local dev Express server
│   ├── routes.ts         # Protected API routes
│   ├── authRoutes.ts     # Auth routes
│   ├── auth.ts           # JWT helpers + middleware
│   ├── db.ts             # Prisma client + seed helpers
│   └── types.ts          # Shared backend types
├── prisma/
│   ├── schema.prisma     # PostgreSQL database schema
│   └── migrations/       # Migration history
├── frontend/
│   ├── vercel.json       # Frontend Vercel config
│   └── src/
│       ├── App.tsx
│       ├── AuthContext.tsx   # Auth + authFetch (uses VITE_API_URL)
│       ├── Dashboard.tsx
│       ├── ChartsPage.tsx
│       ├── StatisticsPage.tsx
│       ├── EarningsPage.tsx
│       ├── SettingsPage.tsx
│       ├── Sidebar.tsx
│       ├── styles.css
│       └── components/
│           ├── InventoryItemCard.tsx
│           ├── CreateItemForm.tsx
│           ├── ConfirmModal.tsx
│           └── Toast.tsx
├── vercel.json           # Backend Vercel config
├── .env                  # Local env (SQLite, never commit)
└── .env.example          # Template for all environments
```
