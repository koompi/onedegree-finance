Here's everything done in this session:

---

## Bug Fixes

### 1. Token Refresh — Rolling Session
**Problem:** Customers reported "Unauthorized" errors. The 7-day refresh token was never rotated, so it expired permanently after 7 days from first login.

**Fixed:**
- auth.ts — `/auth/refresh` now returns a new `refreshToken` alongside the new `accessToken`, resetting the 7-day clock on every use
- api.ts — `tryRefreshToken()` now saves the new `refreshToken` to localStorage, and on total refresh failure calls `logout()` so the app cleanly re-authenticates instead of hanging broken

### 2. Receivables "Paid" Status
**Problem:** Collecting a receivable sent `status: 'collected'` which the DB rejected. Paid items disappeared entirely.

**Fixed** (prior session, carried forward): useReceivables.ts sends `'paid'`, filter excludes `'paid'` correctly.

### 3. Transaction Note Not Showing
**Problem:** Notes were saved to DB column `note` but the `Transaction` interface only had `description`, so detail view always showed "No note".

**Fixed:** useTransactions.ts — added `note?: string` to interface. Display logic reads `note || description`.

### 4. Receipt Upload CORS Error
**Problem:** Browser PUT directly to R2 (`r2.cloudflarestorage.com`) was blocked — the bucket has no CORS policy.

**Fixed:** uploads.ts — replaced 3-step client-side flow with a single `POST /receipts/upload` endpoint that does the full R2 upload server-side. Browser never touches R2.

useReceiptUpload.ts — simplified from 3 fetches to one `FormData` POST to our API.

---

## New Features

### 5. Receivables — Paid Tab + Stats
- Filter pills: All / Overdue / Active / **Paid**
- Stats: "Total Receivable" (unpaid) + "Total Collected" (paid, in green)
- Paid cards show green ✓ icon and "Paid ✓" badge, no action buttons
- Translations added in EN + KM: `sort_paid`, `status_paid`, `receivables_collected`

### 6. Transaction Detail Sheet
Tap any transaction row → bottom sheet showing:
- Big colored amount card (green income / red expense)
- Category, Account, Date, Note rows
- Receipt image inline (tap to open full size)
- Delete button with confirm step
- Row title now prefers `note` → `category` → fallback

### 7. Receivables — Tap to Detail + Receipt Upload
Every receivable row is now a tap target. Detail sheet shows:
- Amount hero card with status (Pending / Overdue / Paid)
- Due date and note rows
- **Receipt image** — upload or view inline
- Collect (with confirm) + Remind + Delete (with confirm)
- No inline buttons on list rows

Receipt upload also added to the **New Receivable add form** — attach a photo at creation time.

### 8. 5MB File Size Guard
useReceiptUpload.ts — files over 5MB are rejected immediately with a bilingual error in Khmer + English, telling the user to send the image via Telegram first and save it as "Compressed".

### 9. DB Migration
006_receivables_receipt.sql — added `receipt_url TEXT` column to `receivables` table. Applied ✅

API receivables.ts — `receipt_url` added to Zod schema, INSERT, and PATCH handler.

---

## Translation Keys Added (EN + KM)

| Key | EN | KM |
|-----|----|----|
| `sort_paid` | Paid | ទូទាត់រួច |
| `status_paid` | Paid ✓ | ទូទាត់រួច ✓ |
| `status_pending` | Pending | កំពុងរង់ចាំ |
| `receivables_collected` | Total Collected | បរិមាណបានសរុប |
| `tx_detail_title` | Transaction Detail | លម្អិតប្រតិបត្តិការ |
| `tx_detail_no_note` | No note | គ្មានកំណត់ចំណាំ |
| `tx_detail_no_category` | Uncategorized | គ្មានប្រភេទ |
| `tx_detail_no_account` | No account | គ្មានគណនី |
| `tx_receipt_label` | Receipt | វិក្កយបត្រ |
| `tx_receipt_tap` | Tap to view full image | ចុចដើម្បីមើលរូបភាព |