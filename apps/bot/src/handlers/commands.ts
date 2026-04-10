import { sendMessage, quickActionsKeyboard } from './telegram'
import { authenticate, getCompanies, getAccounts, getDailySummary } from '../api'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export async function handleCommand(chatId: number, command: string, user: TelegramUser): Promise<void> {
  switch (command) {
    case '/start':
      await handleStart(chatId, user)
      break
    case '/balance':
      await handleBalance(chatId, user)
      break
    case '/summary':
      await handleSummary(chatId, user)
      break
    case '/help':
      await handleHelp(chatId)
      break
    default:
      await sendMessage(chatId, 'Unknown command. Type /help for available commands.\nពាក្យបញ្ជាមិនស្គាល់។ វាយ /help ដើម្បីមើលពាក្យបញ្ជាទាំងអស់។')
  }
}

async function handleStart(chatId: number, user: TelegramUser): Promise<void> {
  await sendMessage(chatId, [
    `<b>Welcome to OneDegree Finance, ${user.first_name}!</b>`,
    `<b>សូមស្វាគមន៍មកកាន់ OneDegree Finance, ${user.first_name}!</b>`,
    ``,
    `Send me a message to log a transaction:`,
    `ផ្ញើសារមកខ្ញុំដើម្បីកត់ត្រាប្រតិបត្តិការ:`,
    ``,
    `<b>Examples / ឧទាហរណ៍:</b>`,
    `  • "sold rice $50"`,
    `  • "bought supplies 200000 riel"`,
    `  • "លក់ $120 ដឹកជញ្ជូន"`,
    ``,
    `You can also send <b>voice messages</b>! / ផ្ញើ<b>សំឡេង</b>បានដែរ!`,
    ``,
    `Use the buttons below for quick actions:`,
    `ចុចប៊ូតុងខាងក្រោមសម្រាប់ការប្រើប្រាស់រហ័ស:`,
  ].join('\n'), { parseMode: 'HTML', replyMarkup: quickActionsKeyboard })
}

async function handleBalance(chatId: number, user: TelegramUser): Promise<void> {
  try {
    const auth = await authenticate(user.id, user.first_name, user.last_name, user.username)
    const companies = await getCompanies(auth.accessToken)
    if (companies.length === 0) {
      await sendMessage(chatId, 'No business found. Please set up in the OneDegree app.\nមិនមានអាជីវកម្មទេ។ សូមបង្កើតក្នុង OneDegree app។', { replyMarkup: quickActionsKeyboard })
      return
    }

    const accounts = await getAccounts(auth.accessToken, companies[0].id)
    if (accounts.length === 0) {
      await sendMessage(chatId, 'No accounts found.\nគ្មានគណនីទេ។', { replyMarkup: quickActionsKeyboard })
      return
    }

    const lines = [`<b>Balance / សមតុល្យ — ${companies[0].name}</b>`, '']
    for (const acc of accounts) {
      lines.push(`  ${acc.name}: <b>$${(acc.balance_cents / 100).toFixed(2)}</b>`)
    }

    await sendMessage(chatId, lines.join('\n'), { parseMode: 'HTML', replyMarkup: quickActionsKeyboard })
  } catch {
    await sendMessage(chatId, 'Failed to get balance. Please try again.\nមិនអាចទាញសមតុល្យបានទេ។ សូមព្យាយាមម្ដងទៀត។', { replyMarkup: quickActionsKeyboard })
  }
}

async function handleSummary(chatId: number, user: TelegramUser): Promise<void> {
  try {
    const auth = await authenticate(user.id, user.first_name, user.last_name, user.username)
    const companies = await getCompanies(auth.accessToken)
    if (companies.length === 0) {
      await sendMessage(chatId, 'No business found.\nមិនមានអាជីវកម្មទេ។', { replyMarkup: quickActionsKeyboard })
      return
    }

    const report = await getDailySummary(auth.accessToken, companies[0].id)
    const profit = report.net_profit_cents
    const lines = [
      `<b>📅 ${report.month} Summary / សង្ខេប</b>`,
      `<b>${companies[0].name}</b>`,
      ``,
      `💰 Income / ចំណូល: <b>$${(report.total_income_cents / 100).toFixed(2)}</b>`,
      `💸 Expense / ចំណាយ: <b>$${(report.total_expense_cents / 100).toFixed(2)}</b>`,
      `${profit >= 0 ? '📈' : '📉'} Net / សុទ្ធ: <b>$${(profit / 100).toFixed(2)}</b>`,
    ]

    await sendMessage(chatId, lines.join('\n'), { parseMode: 'HTML', replyMarkup: quickActionsKeyboard })
  } catch {
    await sendMessage(chatId, 'Failed to get summary. Please try again.\nមិនអាចទាញសង្ខេបបានទេ។ សូមព្យាយាមម្ដងទៀត។', { replyMarkup: quickActionsKeyboard })
  }
}

async function handleHelp(chatId: number): Promise<void> {
  await sendMessage(chatId, [
    '<b>OneDegree Bot Commands / ពាក្យបញ្ជា:</b>',
    '',
    '/start — Welcome / សូមស្វាគមន៍',
    '/balance — Account balances / សមតុល្យគណនី',
    '/summary — Monthly summary / សង្ខេបប្រចាំខែ',
    '/help — This message / សារនេះ',
    '',
    'Or just send a text/voice message to log a transaction!',
    'ឬផ្ញើសារអក្សរ/សំឡេងដើម្បីកត់ត្រាប្រតិបត្តិការ!',
  ].join('\n'), { parseMode: 'HTML', replyMarkup: quickActionsKeyboard })
}
