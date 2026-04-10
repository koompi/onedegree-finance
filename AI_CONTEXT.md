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
- **Pending migration on production DB:** `apps/api/migrations/007_is_personal.sql` — adds `is_personal BOOLEAN NOT NULL DEFAULT FALSE` to the `transactions` table. Must be run before deploying.

## 5. RBAC Middleware
- Three middleware helpers in `apps/api/src/middleware/rbac.ts`:
  - `teamMember` — requires user to be a member of the company (any role)
  - `managerOrOwner` — requires `manager` or `owner` role
  - `ownerOnly` — requires `owner` role
- **Do not use** the old `ownsCompany()` pattern — it checked `companies.owner_id` directly and ignored the `team_members` table entirely, breaking multi-user access. `accounts.ts` and `categories.ts` were fixed to use the proper middleware.

## 6. Dual-Currency (USD / KHR)
- Every transaction stores **two** amount fields:
  - `amount_cents` — USD amount × 100
  - `amount_khr` — KHR integer (raw riels)
- The exchange rate is polled every 6 hours from `open.er-api.com`, with a hardcoded fallback of 4100 KHR/USD, stored in `i18nStore`.
- `CurrencyInput` accepts an optional `currency` prop (`'USD' | 'KHR'`) that overrides the global store setting. Pass this for per-transaction currency selection.
- `TransactionsScreen` stores `txCurrency` state and passes it to `CurrencyInput` and to the API as `currency_input`.

## 7. Business vs. Personal Transactions (`is_personal`)
- `transactions` table has a `is_personal BOOLEAN NOT NULL DEFAULT FALSE` column (migration `007_is_personal.sql`).
- API `POST /transactions` and `PATCH /transactions/:id` both accept `is_personal: boolean`.
- `GET /transactions` accepts `?is_personal=true` or `?is_personal=false` to filter.
- `GET /reports/monthly` accepts `?business_only=true` to exclude personal transactions from P&L.
- Frontend: `TransactionsScreen` shows a `💼 Business / 🏠 Personal` toggle in the add form. Personal transactions show a `🏠` badge on the list item.
- Frontend: `ReportsScreen` has a `💼 Business Only` toggle that appends `&business_only=true` to the report fetch.
- Translations added: `tx_personal`, `tx_business` in both `en` and `km` locales.

## 8. Reusable AddTransactionSheet Component
- `apps/web-v2/src/components/AddTransactionSheet.tsx` — self-contained bottom sheet with the full transaction add form.
- Props: `isOpen`, `onClose`, `defaultType?: 'income' | 'expense'`, `onSaved?: () => void`, `periodLocks?: Record<string, ...>`.
- Resets all form state (amount, category, date, etc.) each time `isOpen` becomes true.
- **DashboardScreen FABs** (`+ Revenue` / `– Expense`) now open this sheet directly with the correct `defaultType` pre-set. After a successful save, `onSaved` navigates to the Transactions screen via `onNavigate('transactions')`.
- **TransactionsScreen** uses `<AddTransactionSheet>` instead of an inline BottomSheet form. Its `onSaved` calls `refetch()` to refresh the list.

## 9. Bot Inline Keyboards (Quick Actions)
- All bot responses now include a persistent 4-button inline keyboard (defined as `quickActionsKeyboard` in `apps/bot/src/handlers/telegram.ts`):
  - `💰 Balance` → `quick_balance`
  - `📊 Summary` → `quick_summary`
  - `➕ Log Income` → `quick_income_help`
  - `➖ Log Expense` → `quick_expense_help`
- `apps/bot/src/handlers/callback.ts` handles all `callback_query` events for these buttons.
- `apps/bot/src/index.ts` routes `callback_query` updates before the `message` handler.
- The bot authenticates via `/auth/bot` (uses `BOT_AUTH_SECRET`), caches the token per `user.id` in `tokenCache` (in `message.ts`).
- **Known limitation / TODO:** Bot always picks `companies[0]` and `accounts[0]`. If a user has multiple companies, there is no way to switch. Need to add a **Switch Org** feature:
  - New `/switchorg` command (or `🔀 Switch Org` quick-action button) that lists companies as inline keyboard buttons
  - New `callback_query` data prefix `switch_org:<companyId>` handled in `callback.ts`
  - On selection: updates `tokenCache` entry with new `companyId` + resolve first account via `getAccounts`

## 10. Period Locking
- `period_locks` table — stores locked months per company (owner/manager can toggle).
- API: `GET /:companyId/periods/locks`, `POST /:companyId/periods/locks/:month`, `DELETE /:companyId/periods/locks/:month`.
- Frontend: Lock icon in `TransactionsScreen` header (owner-only). Locked months block create/delete with a `PeriodLocked` error code.
- `AddTransactionSheet` accepts `periodLocks` prop and checks before saving.

## 11. Navigation Model (No Router)
- `apps/web-v2` has **no React Router**. All screen navigation is managed via `useState<Screen>` in `App.tsx`.
- To navigate from one component deep in the tree, pass `onNavigate: (screen: string) => void` as a prop.
- `DashboardScreen` signature: `({ onNavigate }: { onNavigate: (s: any) => void })`.
- `TransactionsScreen` signature: `({ onBack }: { onBack: () => void })`.

## 12. Known Pre-existing TypeScript Errors (Do NOT fix)
- `apps/web-v2/src/app/layout.tsx` — abandoned Next.js migration artifact, ignored.
- `apps/api/src/routes/reports.ts:475` — `Buffer` type import issue, ignored.
- `apps/web-v2/src/screens/TransactionsScreen.tsx:472` — `divideColor` CSS prop on inline style, ignored.

