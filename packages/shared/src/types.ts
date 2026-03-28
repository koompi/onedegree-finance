import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string().uuid(),
  telegram_id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  lang: z.enum(['km', 'en']).default('km'),
})

export const CompanySchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['agro', 'general', 'retail', 'service', 'other']).default('general'),
  currency_base: z.enum(['USD', 'KHR']).default('USD'),
})

export const AccountSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['cash', 'bank', 'mobile_money']).default('cash'),
  balance_cents: z.number().int().default(0),
})

export const CategorySchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid().nullable(),
  name: z.string().min(1),
  name_km: z.string().nullable(),
  type: z.enum(['income', 'expense']),
  icon: z.string().nullable(),
  is_system: z.boolean().default(false),
})

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount_cents: z.number().int().positive(),
  amount_khr: z.number().int().nullable(),
  exchange_rate: z.number().nullable(),
  currency_input: z.enum(['USD', 'KHR']).default('USD'),
  note: z.string().max(500).nullable(),
  occurred_at: z.string().datetime(),
})

export const ReceivableSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  contact_name: z.string().min(1),
  amount_cents: z.number().int().positive(),
  currency: z.enum(['USD', 'KHR']).default('USD'),
  due_date: z.string().nullable(),
  note: z.string().nullable(),
  status: z.enum(['pending', 'partial', 'paid']).default('pending'),
})

export const PayableSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  contact_name: z.string().min(1),
  amount_cents: z.number().int().positive(),
  currency: z.enum(['USD', 'KHR']).default('USD'),
  due_date: z.string().nullable(),
  note: z.string().nullable(),
  status: z.enum(['pending', 'partial', 'paid']).default('pending'),
})

export type User = z.infer<typeof UserSchema>
export type Company = z.infer<typeof CompanySchema>
export type Account = z.infer<typeof AccountSchema>
export type Category = z.infer<typeof CategorySchema>
export type Transaction = z.infer<typeof TransactionSchema>
export type Receivable = z.infer<typeof ReceivableSchema>
export type Payable = z.infer<typeof PayableSchema>
