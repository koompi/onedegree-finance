# OneDegree Finance v2 — Complete Rebuild

## Context
This is a Telegram Mini App for Cambodian SME bookkeeping. We have a working MVP (v59 frontend, v26 API) that needs a complete rebuild based on a new engineering specification.

## What Changes

### Frontend
- **Vite → Next.js** with TypeScript
- **Light only → Dark + Light theme toggle**
- **USD cents → KHR integer (primary) + USD toggle**
- **React Router → React state routing** (no URLs in Telegram Mini App)
- **Emojis/Lucide → 34 custom SVG flat icons**
- **Separate pages → BottomSheet forms** for all add/edit
- **No component library → 11 custom components** (Icon, Badge, Pill, ListItem, CurrencyInput, Toggle, BottomSheet, InlineConfirm, SGroup/SRow, EmptyState, SkeletonLoader)
- **Basic export → jsPDF + html2canvas + Loan-Ready Reports**

### Backend
- **Keep Hono on Bun + PostgreSQL** (working well)
- Add `/api/v1/` prefix to all routes
- Add `/api/v1/dashboard/summary` endpoint
- Add `/api/v1/reports/loan-ready` endpoint
- Add `/api/v1/export/csv` and `/api/v1/export/pdf` backend endpoints
- Add `/api/v1/notifications/subscribe` endpoints
- Add `/api/v1/preferences` endpoints
- Add `POST /api/v1/bot/webhook` for bot commands
- Change money from cents (BIGINT) to KHR integer (BIGINT, no decimals)

### Database
- Add `user_preferences` table
- Add `stock_movements` table (rename from inventory_movements)
- Add `is_default`, `is_system` to accounts table
- Add `is_vat_registered`, `city` to companies table
- Add `sort_order` to categories
- Rename some columns (amount_cents → amount, balance_cents → balance)
- Business-type-specific seed categories

### Telegram Bot
- Implement bot commands: /start, /help, /summary, /report
- Debt reminder message template
- Daily summary at 8pm
- Webhook endpoint

### Testing
- Vitest for business logic + API
- React Testing Library for components
- Playwright for E2E

## Design System (CRITICAL)

### Colors
```
bg: #0B1120 (dark navy)
card: #131B2E
gold: #E8B84B (brand)
green: #34D399 (income)
red: #F87171 (expense)
blue: #60A5FA (info/telegram)
orange: #FB923C (warning)
purple: #A78BFA (security)
text: #F1F5F9
textSec: #94A3B8
textDim: #64748B
border: rgba(255,255,255,0.06)
```

### Typography
- Body: Kantumruy Pro (Google Fonts)
- Numbers: JetBrains Mono
- Scale: h1=28/900, h2=20/800, body=13/600, label=12/600, caption=11/600, nav=9/700

### Dark/Light Mode
- Dark: colors above
- Light: bg=#F8F7FF, card=#FFFFFF, border=rgba(0,0,0,0.08), text=#1F2937

### Dual Currency
- Primary: KHR (riel) — integer only, formatted with commas, suffix ៛
- Secondary: USD — 2 decimals, prefix $
- Toggle on dashboard header
- All amounts stored in KHR in DB
- USD display = KHR / exchange_rate

## Component Library (build these FIRST)

1. **Icon** — 34 SVG icons (dashboard, transactions, receivable, payable, inventory, reports, settings, plus, minus, bell, chevron, chevronDown, send, download, back, telegram, building, tag, wallet, globe, lock, user, logout, moon, sun, info, check, x, edit, trash, search, calendar, package, arrowUp, arrowDown, fileText, share, refresh, alertTriangle)

2. **Badge** — 6 variants (success/error/warning/info/gold/neutral)

3. **Pill** — Filter button (active=gold, inactive=subtle)

4. **ListItem** — Row with icon, title, subtitle, right content, actions

5. **CurrencyInput** — KHR integer input with live comma formatting, ៛ suffix

6. **Toggle** — On/off switch (gold when on)

7. **BottomSheet** — Slide-up form container with keyboard handling

8. **InlineConfirm** — Two-button delete confirmation strip

9. **SGroup + SRow** — Settings section containers

10. **EmptyState** — Centered icon + title + subtitle + action

11. **SkeletonLoader** — Shimmer placeholder rows

## Screen Routing (React State, NOT React Router)

```typescript
type Screen = 
  | "dashboard" | "transactions" | "receivables"
  | "payables" | "inventory" | "reports" | "settings"
  | "categories" | "accounts" | "companyProfile";
```

Bottom Nav: 5 tabs (Dashboard, Transactions, Receivables, Inventory, Settings)

## Key Business Logic

1. **Profit Margin**: `((income - expense) / income) * 100`
2. **WAC (Weighted Average Cost)**: `(existingQty * currentWAC + incomingQty * incomingCost) / totalQty`
3. **Overdue Detection**: `daysUntilDue = (dueDate - today) / 86400000`
4. **Account Balance Reconciliation**: income += amount, expense -= amount (with reversal on edit/delete)

## Telegram Mini App Integration

- `tg.ready()`, `tg.expand()`, `tg.setBackgroundColor("#0B1120")`
- Safe area insets for iOS home bar
- Viewport resize on keyboard open
- Haptic feedback on key interactions
- Back button for BottomSheet close

## Currency Formatting

```typescript
// KHR: integer only, comma separated, ៛ suffix
1,250,000 ៛

// USD: 2 decimals, $ prefix  
$305.00

// Short KHR: 1.2M ៛, 250K ៛
```

## Khmer Month Names
មករា, កុម្ភៈ, មីនា, មេសា, ឧសភា, មិថុនា, កក្កដា, សីហា, កញ្ញា, តុលា, វិច្ឆិកា, ធ្នូ

## Deployment
- KConsole (KOOMPI Cloud) — same as current
- Frontend: `bun run build` → zip → upload-token → PUT → reupload
- API: `bun build --target=bun` → same flow
- Frontend domain: https://onedegree.tunnel.koompi.cloud
- API domain: https://onedegree-api.tunnel.koompi.cloud

## Existing Working Code
The current codebase is at ~/workspace/onedegree/ with:
- apps/web/src/pages/ — 11 pages (Dashboard, Transactions, etc.)
- apps/api/src/routes/ — 8 route files
- apps/api/src/db/schema.sql — current DB schema

You can reference the current code for API patterns, but the frontend should be built fresh from the spec.

## CRITICAL RULES
1. All UI text in Khmer — zero English visible to users
2. No alert(), confirm(), prompt() — use inline UI
3. Mobile-first, design for 375px width
4. Money in KHR integers in DB, display with comma formatting
5. Every screen has loading skeleton state
6. ErrorBoundary wraps entire app
7. Toast system for success/error notifications
8. Haptic feedback on all key interactions
9. Toggle buttons at bottom for mobile ergonomics
10. Safe area insets for iOS
