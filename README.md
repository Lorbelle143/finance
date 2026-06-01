# Inventory Financial System

A full-stack inventory and financial management app. Track your balance, manage stock, record transactions, and view charts — all per-user with JWT auth.

---

## Tech Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Backend  | Node.js, Express, TypeScript      |
| Database | SQLite via Prisma ORM             |
| Auth     | JWT (15 min) + Refresh tokens (30 days) |
| Frontend | React 18, TypeScript, Vite        |
| Charts   | Recharts                          |

---

## Getting Started

### 1. Install backend dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env`:

```bash
copy .env.example .env
```

The default `.env` works out of the box for local development:

```
DATABASE_URL="file:./prisma/dev.db"
PORT=4000
JWT_SECRET="change-me-to-a-long-random-secret"
NODE_ENV="development"
```

### 3. Run database migrations

```bash
npx prisma migrate dev
```

This creates the SQLite database at `prisma/dev.db` and applies all migrations.

### 4. Start the backend

```bash
npm run dev
```

Backend runs on **http://localhost:4000**

### 5. Install and start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173** and proxies `/api` to the backend.

---

## Features

### Dashboard
- KPI cards: balance, inventory value, total income, total expenses
- Add inventory items directly
- Search and filter inventory
- Add transactions (income or expense) with multiple line items
- Inventory quantities auto-update on each transaction
- Balance auto-updates on each transaction
- Delete transactions (reverses inventory and balance changes)
- Search and filter transaction history

### Charts
- Inventory value distribution (donut chart)
- Income vs Expenses by day (bar chart)
- Net cash flow over time (line chart)

### Statistics
- Income, expense, and net profit summary
- Profit margin calculation
- Cash flow area chart
- Top inventory items by value with progress bars

### Earnings
- Full transaction history
- Search by description
- Filter by income / expense / all

### Settings
- Update display name
- Change password
- Logout

---

## API Endpoints

### Auth (public)
| Method | Path                  | Description          |
|--------|-----------------------|----------------------|
| POST   | /api/auth/register    | Create account       |
| POST   | /api/auth/login       | Login                |
| POST   | /api/auth/refresh     | Refresh access token |
| POST   | /api/auth/logout      | Revoke refresh token |

### Protected (requires Bearer token)
| Method | Path                      | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | /api/status               | Balance + inventory summary    |
| GET    | /api/stats                | Full stats for charts          |
| GET    | /api/items                | List inventory items           |
| POST   | /api/items                | Create inventory item          |
| PATCH  | /api/items/:id            | Update inventory item          |
| DELETE | /api/items/:id            | Delete inventory item          |
| GET    | /api/transactions         | List transactions (paginated)  |
| POST   | /api/transactions         | Create transaction             |
| DELETE | /api/transactions/:id     | Delete + reverse transaction   |
| GET    | /api/account              | Get account balance            |
| PATCH  | /api/account              | Update account balance         |
| PATCH  | /api/profile              | Update display name            |
| PATCH  | /api/profile/password     | Change password                |

---

## Project Structure

```
├── src/                  # Backend source
│   ├── index.ts          # Express app entry
│   ├── routes.ts         # Protected API routes
│   ├── authRoutes.ts     # Auth routes
│   ├── auth.ts           # JWT helpers + middleware
│   ├── db.ts             # Prisma client + seed helpers
│   └── types.ts          # Shared types
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── dev.db            # SQLite database (auto-created)
├── frontend/
│   └── src/
│       ├── App.tsx           # Routes
│       ├── AuthContext.tsx   # Auth state + authFetch
│       ├── Dashboard.tsx     # Main dashboard
│       ├── ChartsPage.tsx    # Charts
│       ├── StatisticsPage.tsx
│       ├── EarningsPage.tsx
│       ├── SettingsPage.tsx
│       ├── Sidebar.tsx
│       ├── styles.css
│       └── components/
│           ├── InventoryItemCard.tsx
│           ├── CreateItemForm.tsx
│           └── ConfirmModal.tsx
└── .env                  # Environment variables
```
