import { sendMessage } from './telegram'
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
    `Welcome to OneDegree Finance, ${user.first_name}!`,
    `សូមស្វាគមន៍មកកាន់ OneDegree Finance, ${user.first_name}!`,
    ``,
    `Send me a message to log a transaction:`,
    `ផ្ញើសារមកខ្ញុំដើម្បីកត់ត្រាប្រតិបត្តិការ:`,
    ``,
    `Examples / ឧទាហរណ៍:`,
    `  "sold rice $50"`,
    `  "bought supplies 200000 riel"`,
    `  "income $120 delivery"`,
    ``,
    `You can also send voice messages!`,
    `អ្នកអាចផ្ញើសារជាសំឡេងបានដែរ!`,
    ``,
    `Type /help for all commands.`,
  ].join('\n'))
}

async function handleBalance(chatId: number, user: TelegramUser): Promise<void> {
  try {
    const auth = await authenticate(user.id, user.first_name, user.last_name, user.username)
    const companies = await getCompanies(auth.accessToken)
    if (companies.length === 0) {
      await sendMessage(chatId, 'No business found. Please set up in the OneDegree app.\nមិនមានអាជីវកម្មទេ។ សូមបង្កើតក្នុង OneDegree app។')
      return
    }

    const accounts = await getAccounts(auth.accessToken, companies[0].id)
    if (accounts.length === 0) {
      await sendMessage(chatId, 'No accounts found.\nគ្មានគណនីទេ។')
      return
    }

    const lines = ['Balance / សមតុល្យ:', '']
    for (const acc of accounts) {
      lines.push(`  ${acc.name}: $${(acc.balance_cents / 100).toFixed(2)}`)
    }

    await sendMessage(chatId, lines.join('\n'))
  } catch {
    await sendMessage(chatId, 'Failed to get balance. Please try again.\nមិនអាចទាញសមតុល្យបានទេ។ សូមព្យាយាមម្ដងទៀត។')
  }
}

async function handleSummary(chatId: number, user: TelegramUser): Promise<void> {
  try {
    const auth = await authenticate(user.id, user.first_name, user.last_name, user.username)
    const companies = await getCompanies(auth.accessToken)
    if (companies.length === 0) {
      await sendMessage(chatId, 'No business found.\nមិនមានអាជីវកម្មទេ។')
      return
    }

    const report = await getDailySummary(auth.accessToken, companies[0].id)
    const lines = [
      `${report.month} Summary / សង្ខេប:`,
      ``,
      `  Income / ចំណូល: $${(report.total_income_cents / 100).toFixed(2)}`,
      `  Expense / ចំណាយ: $${(report.total_expense_cents / 100).toFixed(2)}`,
      `  Net / សុទ្ធ: $${(report.net_profit_cents / 100).toFixed(2)}`,
    ]

    await sendMessage(chatId, lines.join('\n'))
  } catch {
    await sendMessage(chatId, 'Failed to get summary. Please try again.\nមិនអាចទាញសង្ខេបបានទេ។ សូមព្យាយាមម្ដងទៀត។')
  }
}

async function handleHelp(chatId: number): Promise<void> {
  await sendMessage(chatId, [
    'OneDegree Bot Commands:',
    'ពាក្យបញ្ជា OneDegree Bot:',
    '',
    '/start — Welcome / សូមស្វាគមន៍',
    '/balance — Account balances / សមតុល្យគណនី',
    '/summary — Monthly summary / សង្ខេបប្រចាំខែ',
    '/help — This message / សារនេះ',
    '',
    'Or just send a text/voice message to log a transaction!',
    'ឬផ្ញើសារអក្សរ/សំឡេងដើម្បីកត់ត្រាប្រតិបត្តិការ!',
  ].join('\n'))
}
