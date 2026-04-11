const API_URL = process.env.ONEDEGREE_API_URL ?? 'https://onedegree-api.tunnel.koompi.cloud'

interface AuthResponse {
  user: { id: string; telegram_id: number; name: string }
  accessToken: string
  refreshToken: string
}

interface Transaction {
  id: string
  type: string
  amount_cents: number
  note: string | null
  occurred_at: string
}

interface Account {
  id: string
  name: string
  balance_cents: number
  type: string
}

interface MonthlyReport {
  month: string
  total_income_cents: number
  total_expense_cents: number
  net_profit_cents: number
  accounts: Account[]
}

async function apiRequest<T>(path: string, options: {
  method?: string
  token?: string
  body?: Record<string, unknown>
}): Promise<T> {
  const { method = 'GET', token, body } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err}`)
  }

  return res.json() as Promise<T>
}

export async function authenticate(telegramId: number, firstName: string, lastName?: string, username?: string): Promise<AuthResponse> {
  const secret = process.env.BOT_AUTH_SECRET ?? ''
  return apiRequest<AuthResponse>('/auth/bot', {
    method: 'POST',
    body: { telegramId, firstName, lastName, username, secret },
  })
}

export async function getCompanies(token: string): Promise<Array<{ id: string; name: string }>> {
  return apiRequest<Array<{ id: string; name: string }>>('/companies', { token })
}

export async function logTransaction(token: string, companyId: string, data: {
  accountId: string
  type: 'income' | 'expense'
  amountCents: number
  currencyInput: 'USD' | 'KHR'
  note?: string
}): Promise<Transaction> {
  return apiRequest<Transaction>(`/companies/${companyId}/transactions`, {
    method: 'POST',
    token,
    body: {
      account_id: data.accountId,
      type: data.type,
      amount_cents: data.amountCents,
      currency_input: data.currencyInput,
      note: data.note,
      occurred_at: new Date().toISOString(),
    },
  })
}

export async function getAccounts(token: string, companyId: string): Promise<Account[]> {
  return apiRequest<Account[]>(`/companies/${companyId}/accounts`, { token })
}

export async function getDailySummary(token: string, companyId: string): Promise<MonthlyReport> {
  const month = new Date().toISOString().slice(0, 7)
  return apiRequest<MonthlyReport>(`/companies/${companyId}/reports/monthly?month=${month}`, { token })
}

export async function pairBotCode(code: string, telegramId: number, firstName: string, lastName?: string, username?: string): Promise<AuthResponse> {
  const secret = process.env.BOT_AUTH_SECRET ?? ''
  return apiRequest<AuthResponse>('/auth/pair-bot', {
    method: 'POST',
    body: { code, telegramId, firstName, lastName, username, secret },
  })
}
