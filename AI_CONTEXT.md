# OneDegree Finance - AI Development Context

This document provides critical engineering context for AI assistants working on the `onedegree-finance` project. Read this before changing architectural logic or debugging systemic errors.

## 1. API Routing & Frontend Communication
- **API Mounting:** The backend (`apps/api`) mounts almost all business routes (e.g., `transactions`, `receivables`, `inventory`) under the `/companies` prefix in `index.ts`.
  - Example: `transactions.get('/:companyId/transactions')` resolves to completely: `/companies/:companyId/transactions`.
- **Frontend V2 (`apps/web-v2`):** The V2 frontend incorrectly omits the `/companies` prefix in its hook calls (e.g., `api.get(/:companyId/transactions)`).
  - **The Fix:** We implemented an interceptor in `apps/web-v2/src/lib/api.ts` so that during local development (`import.meta.env.DEV`), requests automatically prepend `/companies` to any path that is not `/auth` or `/health`. Do not remove this logic unless the endpoints themselves are refactored.

## 2. Authentication & Local Environment (Telegram Bypass)
- **Production Auth:** Uses Telegram Mini App `initData` passed to `/auth/telegram` for verification.
- **Local Dev Bypass:** To work locally without Telegram:
  1. The API's `.env` must be set to `NODE_ENV=development`.
  2. The frontend shows a custom `Local Dev Login` screen when `import.meta.env.DEV` is true and Telegram `initData` is missing.
  3. Logging in with `admin` / `123123123` sends a mock payload: `initData: 'dev_admin:admin:123123123'`. 
  4. The API intercepts `dev_admin` and authenticates the user as `telegramId=999999` (Admin Developer).

## 3. Infinite Loading Loop Prevention (Company Provisioning)
- The UI in `web-v2` relies exclusively on the user having a valid `companyId` (handled by `useDashboard` and `App.tsx`). 
- If the `admin` user logs in but doesn't have a company, the dashboard gets stuck looping/loading indefinitely.
- **The Fix:** The `/auth/telegram` endpoint in `apps/api/src/routes/auth.ts` will **automatically create** a mock "Admin Business" company and a default "Cash in Hand" account if the `dev_admin` user has zero companies.

## 4. Database Schema Changes & Migrations
- Our schema is defined in `apps/api/src/db/schema.sql`.
- **Gotcha:** We use `CREATE TABLE IF NOT EXISTS`. This means adding a new column to the `schema.sql` file (like `name_km` in `inventory_items`) **will not** automatically add it to the live database if the table already exists.
- **Solution:** Always run a manual `ALTER TABLE table_name ADD COLUMN ...` directly against the database or drop the local table if it's safe, whenever you modify existing schemas. Failing to do so throws Postgres errors (e.g. `column does not exist`).
