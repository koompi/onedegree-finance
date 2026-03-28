import { parseTransaction } from '../gemini'
import { authenticate, getCompanies, getAccounts, logTransaction } from '../api'
import { sendMessage } from './telegram'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

const tokenCache = new Map<number, { token: string; companyId: string; accountId: string }>()

async function ensureAuth(user: TelegramUser): Promise<{ token: string; companyId: string; accountId: string }> {
  const cached = tokenCache.get(user.id)
  if (cached) return cached

  const auth = await authenticate(user.id, user.first_name, user.last_name, user.username)
  const companies = await getCompanies(auth.accessToken)
  if (companies.length === 0) {
    throw new Error('NO_COMPANY')
  }

  const companyId = companies[0].id
  const accounts = await getAccounts(auth.accessToken, companyId)
  if (accounts.length === 0) {
    throw new Error('NO_ACCOUNT')
  }

  const entry = { token: auth.accessToken, companyId, accountId: accounts[0].id }
  tokenCache.set(user.id, entry)
  return entry
}

export async function handleTextMessage(chatId: number, text: string, user: TelegramUser): Promise<void> {
  const parsed = await parseTransaction(text)

  if (parsed.type === 'unclear' || parsed.confidence < 0.7) {
    await sendMessage(chatId, [
      `I'm not sure I understood that. / មិនច្បាស់ទេ។`,
      ``,
      `Please try again with a clearer message like:`,
      `"sold rice $50" or "bought supplies 200000 riel"`,
    ].join('\n'))
    return
  }

  let auth: { token: string; companyId: string; accountId: string }
  try {
    auth = await ensureAuth(user)
  } catch (e) {
    const err = e as Error
    if (err.message === 'NO_COMPANY') {
      await sendMessage(chatId, 'Please set up your business first in the OneDegree app.\nសូមបង្កើតអាជីវកម្មរបស់អ្នកក្នុង OneDegree app ជាមុនសិន។')
      return
    }
    if (err.message === 'NO_ACCOUNT') {
      await sendMessage(chatId, 'Please add an account first in the OneDegree app.\nសូមបន្ថែមគណនីក្នុង OneDegree app ជាមុនសិន។')
      return
    }
    throw err
  }

  const amountCents = Math.round(parsed.amount * 100)
  await logTransaction(auth.token, auth.companyId, {
    accountId: auth.accountId,
    type: parsed.type as 'income' | 'expense',
    amountCents,
    currencyInput: parsed.currency,
    note: parsed.note,
  })

  const sign = parsed.type === 'income' ? '+' : '-'
  const currencySymbol = parsed.currency === 'USD' ? '$' : 'KHR '

  await sendMessage(chatId, [
    `Logged / បានកត់ត្រា`,
    `${sign}${currencySymbol}${parsed.amount.toFixed(2)} — ${parsed.note}`,
    parsed.note_km !== parsed.note ? parsed.note_km : '',
  ].filter(Boolean).join('\n'))
}
