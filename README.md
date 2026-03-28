# 1° OneDegree Finance

Telegram mini app for Cambodian SME owners to track income, expenses, and profitability.

## Stack
- Backend: Hono + Bun + PostgreSQL
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Auth: Telegram WebApp (no separate login needed)

## Setup
```bash
bun install
cp apps/api/.env.example apps/api/.env  # fill in values
cp apps/web/.env.example apps/web/.env
psql $DATABASE_URL -f apps/api/src/db/schema.sql
```

## Dev
```bash
bun run dev:api   # http://localhost:3001
bun run dev:web   # http://localhost:5173
```
