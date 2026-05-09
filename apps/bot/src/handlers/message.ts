import { parseTransaction } from '../gemini'
import { authenticate, getCompanies, getAccounts, logTransaction } from '../api'
import { sendMessage, quickActionsKeyboard } from './telegram'
import { userStates, userActiveCompany, ActiveCompanyState } from './state'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

async function ensureAuth(user: TelegramUser): Promise<{ token: string; companyId: string; accountId: string }> {
  const auth = await authenticate(user.id, user.first_name, user.last_name, user.username)
  
  const active = userActiveCompany.get(user.id)
  if (active) {
    return { token: auth.accessToken, companyId: active.companyId, accountId: active.accountId }
  }

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
  userActiveCompany.set(user.id, { companyId: entry.companyId, accountId: entry.accountId })
  return entry
}

export async function handleTextMessage(chatId: number, text: string, user: TelegramUser): Promise<void> {
  let parsed: any

  const state = userStates.get(chatId)
  if (state) {
    userStates.delete(chatId) // Clear state immediately

    const regex = /(?:(\$|usd|riel|r|khr)\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s*(\$|usd|riel|r|khr))?/i
    const match = text.match(regex)

    if (match) {
      const numStr = match[2].replace(/,/g, '')
      const currencyStr = (match[1] || match[3] || '').toLowerCase()

      let currency: 'USD' | 'KHR' = 'USD'
      if (['riel', 'r', 'khr'].includes(currencyStr)) {
        currency = 'KHR'
      } else if (numStr && parseFloat(numStr) >= 100 && currencyStr === '') {
        currency = 'KHR' // Fallback heuristic: large numbers without symbol = KHR
      }

      const note = text.replace(match[0], '').trim() || (state === 'income' ? 'Income' : 'Expense')

      parsed = {
        type: state,
        amount: parseFloat(numStr),
        currency,
        note,
        note_km: note,
        confidence: 1.0,
      }
    } else {
      await sendMessage(chatId, `❌ Could not find an amount in your message. Please try again. / រកមិនឃើញចំនួនទឹកប្រាក់។`, { replyMarkup: quickActionsKeyboard })
      return
    }
  } else {
    parsed = await parseTransaction(text)
  }

  if (parsed.type === 'unclear' || parsed.confidence < 0.7) {
    await sendMessage(chatId, [
      `I'm not sure I understood that. / មិនច្បាស់ទេ។`,
      ``,
      `Please try again with a clearer message like:`,
      `"sold rice $50" or "bought supplies 200000 riel"`,
    ].join('\n'), { replyMarkup: quickActionsKeyboard })
    return
  }

  let auth: { token: string; companyId: string; accountId: string }
  try {
    auth = await ensureAuth(user)
  } catch (e) {
    const err = e as Error
    if (err.message === 'NO_COMPANY') {
      await sendMessage(chatId, 'Please set up your business first in the OneDegree app.\nសូមបង្កើតអាជីវកម្មរបស់អ្នកក្នុង OneDegree app ជាមុនសិន។', { replyMarkup: quickActionsKeyboard })
      return
    }
    if (err.message === 'NO_ACCOUNT') {
      await sendMessage(chatId, 'Please add an account first in the OneDegree app.\nសូមបន្ថែមគណនីក្នុង OneDegree app ជាមុនសិន។', { replyMarkup: quickActionsKeyboard })
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
    `✅ Logged / បានកត់ត្រា`,
    `<b>${sign}${currencySymbol}${parsed.amount.toFixed(2)}</b> — ${parsed.note}`,
    parsed.note_km !== parsed.note ? parsed.note_km : '',
  ].filter(Boolean).join('\n'), { parseMode: 'HTML', replyMarkup: quickActionsKeyboard })
}
