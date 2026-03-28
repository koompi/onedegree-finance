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
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? ''
  const checkDataString = `auth_date=${Math.floor(Date.now() / 1000)}\nfirst_name=${firstName}${lastName ? `\nlast_name=${lastName}` : ''}\nid=${telegramId}${username ? `\nusername=${username}` : ''}`

  const crypto = await import('crypto')
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = crypto.createHmac('sha256', secretKey).update(checkDataString).digest('hex')

  const initData = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    hash,
    user: JSON.stringify({
      id: telegramId,
      first_name: firstName,
      last_name: lastName ?? '',
      username: username ?? '',
    }),
  }).toString()

  return apiRequest<AuthResponse>('/auth/telegram', {
    method: 'POST',
    body: { initData },
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
