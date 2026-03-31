# OneDegree Finance — Current Status & Database

> For: External agent review | Date: 2026-03-30 23:05 ICT
> Author: Nady Chea / KOOMPI Team

---

## 1. DEPLOYMENT STATUS

| Component | Version | URL | Status |
|-----------|---------|-----|--------|
| Frontend (React) | v59 | https://onedegree.tunnel.koompi.cloud | ✅ Live |
| API (Hono/Bun) | v26 | https://onedegree-api.tunnel.koompi.cloud | ✅ Live |
| Telegram Bot | — | @Onedegreefinance_bot | ✅ Active |
| Database | PostgreSQL | Hosted (KConsole) | ✅ Live |

**Deployment method:** KConsole (KOOMPI Cloud) — zip upload → upload-token API → PUT → reupload API
**Build:** `bun run build` (Vite) → dist/

---

## 2. WHAT'S COMPLETE (MVP)

### Frontend Pages (11 pages, ~2440 lines total)

| Page | File | Lines | Status |
|------|------|-------|--------|
| Dashboard | Dashboard.tsx | 248 | ✅ Complete |
| Add Transaction | AddTransaction.tsx | 201 | ✅ Complete |
| Edit Transaction | EditTransaction.tsx | 149 | ✅ Complete |
| Transaction List | TransactionList.tsx | 165 | ✅ Complete |
| Receivables | Receivables.tsx | 174 | ✅ Complete |
| Payables | Payables.tsx | 158 | ✅ Complete |
| Inventory | Inventory.tsx | 373 | ✅ Complete |
| Report | Report.tsx | 281 | ✅ Complete |
| Settings | Settings.tsx | 336 | ✅ Complete |
| Accounts | Accounts.tsx | 120 | ✅ Complete |
| Onboarding | Onboarding.tsx | 235 | ✅ Complete |

### Components (6, ~236 lines)

| Component | Purpose |
|-----------|---------|
| BottomNav | Fixed bottom navigation (5 tabs) |
| CompanySwitcher | Company selector dropdown |
| CurrencyInput | USD/KHR input with toggle |
| Toast | Success/error notifications |
| OfflineBanner | Offline state indicator |
| ProfitPulse | Profit margin visual |

### Features Working

- ✅ Dashboard: cash position, income/expense bars, profit margin %, today summary, action alerts, daily tips, split FAB
- ✅ Transactions: add, edit, delete, list, search, date picker (today/yesterday/custom), "Log another" overlay
- ✅ Receivables: add, mark paid, delete, Telegram reminder (📩), overdue highlighting
- ✅ Payables: add, mark paid, delete, overdue highlighting
- ✅ Inventory: WAC cost tracking, stock movements, quote generator, CRUD
- ✅ Reports: monthly summary, profit margin %, PDF export, CSV/Excel export, share
- ✅ Categories: per-company seed data, full CRUD, all deletable (no system protection)
- ✅ Accounts: cash/bank accounts, balance tracking
- ✅ Company Profile: name, business type, tax ID, phone, address
- ✅ Auth: Telegram WebApp SDK + JWT, fallback when bot token not set
- ✅ 100% Khmer UI
- ✅ All forms have Khmer placeholders
- ✅ No confirm() dialogs — inline confirm pattern on all delete actions
- ✅ Toggle buttons at bottom for mobile ergonomics
- ✅ Offline detection banner

---

## 3. DATABASE SCHEMA (PostgreSQL)

### Tables

```sql
-- Core tables
users          (id UUID, telegram_id BIGINT, name TEXT, username TEXT, lang TEXT)
companies      (id UUID, owner_id UUID FK→users, name TEXT, type TEXT, currency_base TEXT,
                business_type VARCHAR(50), tax_id VARCHAR(50), phone VARCHAR(20), address TEXT, logo_url TEXT)
accounts       (id UUID, company_id UUID FK→companies, name TEXT, type TEXT, balance_cents BIGINT)
categories     (id UUID, company_id UUID FK→companies, name TEXT, name_km TEXT, type TEXT, icon TEXT, is_system BOOLEAN)
transactions   (id UUID, company_id UUID FK→companies, account_id UUID FK→accounts (OPTIONAL), category_id UUID FK→categories,
                type TEXT CHECK('income','expense','transfer'), amount_cents BIGINT, amount_khr BIGINT, exchange_rate NUMERIC,
                currency_input TEXT, note TEXT, occurred_at TIMESTAMPTZ)
receivables    (id UUID, company_id UUID FK→companies, contact_name TEXT, amount_cents BIGINT, currency TEXT,
                due_date DATE, note TEXT, status TEXT CHECK('pending','partial','paid'))
payables       (id UUID, company_id UUID FK→companies, contact_name TEXT, amount_cents BIGINT, currency TEXT,
                due_date DATE, note TEXT, status TEXT CHECK('pending','partial','paid'))
inventory_items    (id UUID, company_id UUID FK→companies, name TEXT, name_km TEXT, sku TEXT, unit TEXT,
                    current_qty NUMERIC, avg_cost_cents BIGINT, threshold NUMERIC)
inventory_movements (id UUID, item_id UUID FK→inventory_items, movement_type TEXT, quantity NUMERIC,
                     cost_per_unit_cents BIGINT, note TEXT, created_at TIMESTAMPTZ)
```

### Key Design Decisions

1. **Money in cents (BIGINT)** — avoids floating point issues. `$25.00` = `2500`
2. **account_id is OPTIONAL on transactions** — users without accounts can still log transactions
3. **Categories are per-company** — when a new company is created, 12 seed categories are copied with `is_system = FALSE`
4. **is_system column on categories** — seed data uses `is_system = TRUE` (no company_id), company copies use `FALSE`
5. **System categories (no company_id)** serve as templates only — not visible in user queries

### Migrations Applied

| Migration | Status |
|-----------|--------|
| schema.sql (initial) | ✅ Applied |
| 002_company_profile.sql (business_type, tax_id, phone, address, logo_url) | ⚠️ May not be run |
| 003_seed_existing_companies.sql (per-company seed) | ⚠️ May not be run |
| Inventory tables (via bun script) | ✅ Applied |

### Indexes

```sql
idx_transactions_company       (company_id)
idx_transactions_account       (account_id)
idx_transactions_occurred      (occurred_at DESC)
idx_transactions_company_month (company_id, to_char(occurred_at, 'YYYY-MM'))
idx_transactions_type          (company_id, type)
idx_receivables_company_status (company_id, status)
idx_payables_company_status    (company_id, status)
idx_accounts_company           (company_id)
idx_categories_company         (company_id)
idx_companies_owner            (owner_id)
```

---

## 4. API ROUTES (Hono on Bun)

### Auth
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /auth/telegram | Telegram WebApp login → JWT |
| POST | /auth/bot | Bot-only auth (internal) |
| POST | /auth/refresh | Refresh JWT token |

### Companies
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /companies | List user's companies (max 3) |
| POST | /companies | Create company + seed categories |
| PATCH | /companies/:id | Update company profile |
| DELETE | /companies/:id | Delete company |

### Transactions
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /companies/:id/transactions | List (with month filter) |
| POST | /companies/:id/transactions | Create (account_id optional) |
| GET | /companies/:id/transactions/:id | Get single (for edit pre-fill) |
| PATCH | /companies/:id/transactions/:id | Update (with balance reversal) |
| DELETE | /companies/:id/transactions/:id | Delete (with balance reversal) |

### Categories
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /companies/:id/categories | List (company-only) |
| POST | /companies/:id/categories | Create (is_system = FALSE) |
| DELETE | /companies/:id/categories/:id | Delete any category |

### Accounts
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /companies/:id/accounts | List |
| POST | /companies/:id/accounts | Create |
| PATCH | /companies/:id/accounts/:id | Update |
| DELETE | /companies/:id/accounts/:id | Delete (with balance reversal) |

### Receivables
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /companies/:id/receivables | List (with status filter) |
| POST | /companies/:id/receivables | Create |
| PATCH | /companies/:id/receivables/:id | Update (mark paid) |
| DELETE | /companies/:id/receivables/:id | Delete |

### Payables
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /companies/:id/payables | List (with status filter) |
| POST | /companies/:id/payables | Create |
| PATCH | /companies/:id/payables/:id | Update (mark paid) |
| DELETE | /companies/:id/payables/:id | Delete |

### Inventory
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /companies/:id/inventory/items | List |
| POST | /companies/:id/inventory/items | Create |
| GET | /companies/:id/inventory/items/:id | Detail + WAC calc |
| DELETE | /companies/:id/inventory/items/:id | Delete |
| POST | /companies/:id/inventory/items/:id/movements | Add stock movement |
| GET | /companies/:id/inventory/items/:id/movements | List movements |

### Reports
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /companies/:id/reports/monthly | Monthly summary + category breakdown + accounts |

---

## 5. TECH STACK

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React + TypeScript | React 18, TS 5 |
| Styling | Tailwind CSS | 3.x |
| Build | Vite | 5.x |
| State | React Query + Zustand | TanStack Query v5, Zustand |
| Backend | Hono on Bun | Hono 4.x, Bun latest |
| Database | PostgreSQL | 16 |
| ORM | Raw SQL (pg driver) | — |
| Auth | Telegram WebApp SDK + JWT | — |
| Icons | Lucide React | — |
| Deployment | KConsole (KOOMPI Cloud) | — |

---

## 6. PROJECT STRUCTURE

```
onedegree/
├── apps/
│   ├── web/                    # Frontend (React)
│   │   ├── src/
│   │   │   ├── pages/          # 11 pages (Dashboard, Transactions, etc.)
│   │   │   ├── components/     # 6 shared components
│   │   │   ├── lib/            # api.ts, telegram.ts, offline.ts
│   │   │   ├── store/          # Zustand auth store
│   │   │   └── App.tsx         # Router setup
│   │   └── package.json
│   └── api/                    # Backend (Hono)
│       ├── src/
│       │   ├── routes/         # 8 route files (auth, companies, transactions, etc.)
│       │   ├── middleware/     # JWT auth middleware
│       │   ├── db/             # PostgreSQL client + schema
│       │   └── index.ts        # App entry + route mounting
│       ├── migrations/         # SQL migrations (001-003)
│       └── package.json
└── package.json                # Monorepo root
```

---

## 7. KNOWN ISSUES / GAPS

### High Priority
1. **002_company_profile.sql migration may not be applied** — columns may be missing in production DB
2. **003_seed_existing_companies.sql migration may not be applied** — existing companies might not have categories
3. **TELEGRAM_BOT_TOKEN not set in KConsole** — auth fallback is less secure than HMAC validation

### Medium Priority
4. **No error boundary** — React errors crash the entire app
5. **No input validation on frontend** — only API-side Zod validation
6. **Inventory movements don't update account balance** — stock purchases aren't reflected in cash flow
7. **No recurring transactions** — manual entry only
8. **No budget tracking** — income/expense tracking only

### Low Priority
9. **No receipt photo attachments**
10. **No multi-user collaboration**
11. **No offline-first support**
12. **Logo upload field exists in DB but no UI**

---

## 8. DESIGN DECISIONS

| Decision | Reasoning |
|----------|-----------|
| All UI in Khmer | Target users are Cambodian SME owners |
| Money stored in cents (BIGINT) | Avoids floating point precision issues |
| Per-company categories | Each company customizes their own, not shared |
| Inline confirm (not confirm()) | Telegram iOS WebView blocks confirm() |
| Toggles at bottom | Mobile ergonomics — thumb reach |
| Split FAB (income/expense) | Fastest path to logging — one tap each |
| account_id optional | Users can log transactions before creating accounts |
| No ORM | Raw SQL for full control, simple queries |
| KConsole deployment | KOOMPI's own cloud platform |
| Currency: USD display, KHR conversion | Cambodian businesses use both |

---

## 9. BUSINESS MODEL

| Product | Target | Revenue Model |
|---------|--------|---------------|
| OneDegree Finance (Free) | SME owners | User acquisition |
| Loan-Ready Reports | MFI/Bank loan officers | B2B2C (bank pays per user) |
| Company data export | Bank partnerships | Data insights |

**Target MFIs:** LOLC, Hattha Bank, AMK Microfinance, Sathapana Bank

---

## 10. WHAT NEEDS TO HAPPEN NEXT (per engineering spec)

The engineering spec you shared defines the full vision. Here's what's built vs what's in the spec:

### ✅ In Spec & Built
- Dashboard with cash position, income/expense, profit margin
- All CRUD for transactions, receivables, payables, inventory
- Category management (per-company)
- PDF/CSV export
- Telegram Mini App integration
- Auth via Telegram

### ⚠️ In Spec But Partial/Not Built
- **Loan-Ready Report Format** (Section 14) — PDF export exists but not MFI-formatted
- **Error Boundary** (Section 17) — not implemented
- **Toast system** (Section 18) — basic toast exists
- **Testing** (Section 19) — no tests
- **Design system tokens** (Section 2) — colors match but not formalized
- **Component library** (Section 3) — basic components, not a formal library

### ❌ Not Built Yet
- **Recurring transactions**
- **Budget tracking**
- **Receipt photo attachments**
- **Multi-user collaboration**
- **Offline-first support**
- **Push notifications**
- **Khmer number formatting** (0-hundred thousand)

---

*End of status document. Ready for external agent review.*
