## Prophit MVP

Prophit tracks significant probability movements in prediction markets (Polymarket for this MVP) and surfaces what moved and when.

### Core Features
- Monitor Polymarket markets on an interval (default 5 minutes)
- Store market snapshots and price history in SQLite via Prisma
- Detect significant movements (default 10%+ change) within a rolling 24h window
- Movement feed with filters and auto-refresh
- Individual market page with price chart and recent movements

### Tech Stack
- Frontend: Next.js (App Router), React 19, Tailwind CSS 4, Recharts
- Backend: Next.js API routes, Prisma ORM, SQLite (file DB for local/dev)
- Data Source: Polymarket Gamma API (`https://gamma-api.polymarket.com`)

---

## Setup

### Prerequisites
- Node.js 20+

### 1) Install dependencies
```bash
npm ci
```

### 2) Environment variables
Create `.env` in `prophit-mvp/`:
```env
DATABASE_URL=file:./prisma/dev.db
POLYMARKET_API_KEY="<your-key>"
POLYMARKET_SECRET="<your-secret>"
POLYMARKET_PASSPHRASE="<your-passphrase>"
POLYMARKET_PRIVATE_KEY="<your-private-key>"

# Movement detection configuration
MOVEMENT_THRESHOLD="10"                  # percent change threshold for "minor" movement
MOVEMENT_LOOKBACK_MINUTES="60"          # fallback baseline window if 24h history is insufficient
```

### 3) Generate Prisma client and create DB
```bash
npx prisma generate
npx prisma db push
```

### 4) Run the app
```bash
npm run dev
```
Open `http://localhost:3000`. The collector starts automatically on first load.

---

## How It Works (Architecture)

- `src/lib/polymarket.ts`
  - Lightweight client for Polymarket Gamma API, helpers for probability and percentage change
- `src/lib/data-collector.ts`
  - Orchestrates polling, persists markets and price history, detects movements
  - Poll interval: 5 minutes (configurable in code)
  - Movement detection: compares current probability to a baseline
    - Primary baseline: earliest price within last 24h
    - Fallback baseline: earliest price within `MOVEMENT_LOOKBACK_MINUTES`
    - Final fallback: earliest known price for the market
- `src/app/api/*`
  - `/api/start-collector` POST: start polling; DELETE: stop
  - `/api/movements` GET: list recent detected movements; optional `?significance=minor|moderate|major`
  - `/api/markets/[id]` GET: market details (latest, history, movements)
- `prisma/schema.prisma`
  - Tables: `markets`, `market_price_histories`, `market_movements`

Data flow per poll:
1) Fetch active markets → upsert basic market info
2) Save current price → create a history row
3) Detect movement against baseline → create a movement row if above threshold

---

## Usage Guide

- Home page shows the Movement Feed
  - Filter by significance (All, Minor 10%+, Moderate 15%+, Major 25%+)
  - Auto-refresh every 2 minutes; manual refresh available
- Click a movement to open the Market page
  - Responsive price chart (select 1h/6h/24h/7d)
  - Sidebar shows current stats and recent movements

Notes on first run: with a fresh DB the first poll sets a baseline. Movements appear after subsequent polls once the delta ≥ `MOVEMENT_THRESHOLD`.

---

## API Endpoints

- `GET /api/movements?significance=minor|moderate|major`
  - Returns recent movements ordered by `createdAt desc`
- `POST /api/start-collector` / `DELETE /api/start-collector`
  - Start/stop the background polling process
- `GET /api/markets/:id`
  - Returns market details including recent history and movements

---

## Design Decisions & Trade-offs
- SQLite for MVP simplicity; Prisma makes it easy to switch to Postgres/MySQL later
- Baseline fallback enables earlier movement detection during demos; default logic still honors 24h baseline first
- Rate limits: conservative polling (5 min) and minimal API calls per poll
- Server logs include Prisma query logs for visibility during development

---

## Troubleshooting

- Prisma P1012 (DATABASE_URL not found): ensure commands run from `prophit-mvp/` and `.env` exists there
- Duplicate root artifacts: ensure there’s no `G:\poly\node_modules`, `G:\poly\package-lock.json`, or `G:\poly\prisma` interfering
- Regenerate client after schema changes: `npx prisma generate`
- Apply schema changes to DB: `npx prisma db push`

---

## Roadmap / Next Steps
- News attribution (naive headline fetch or mocked mapping)
- Category filtering and adjustable thresholds in UI
- Basic auth for admin actions
- Dockerfile for local/dev parity
- Unit tests for detection logic and utilities

---

## Security
Credentials in `.env` are for evaluation only. In production, store secrets in a secure secrets manager and never commit `.env` files.

