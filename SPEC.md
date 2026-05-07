# SPEC

## §G
Allow user record transaction for past or custom date via UI date picker.

## §C
- Backend API already accepts `occurred_at`.
- Frontend transaction form must include date picker field.
- Default date must be current date.
- Must work on mobile Telegram WebApp.

## §I
- UI: Transaction creation forms (Income, Expense).
- Payload: `occurred_at` field in POST/PUT `/transactions`.

## §V
1. ∀ new transaction, `occurred_at` matches user selected date.
2. ∀ new transaction, `occurred_at` defaults to `now()` if unchanged.
3. ∃ date picker UI on transaction form.

## §T
id | status | task | cites
---|---|---|---
T1 | x | Add date picker to frontend transaction forms | §I, §V.3
T2 | x | Bind date picker value to `occurred_at` in submission payload | §V.1, §V.2

## §B
id | date | cause | fix
---|---|---|---
