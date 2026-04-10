import { sendMessage, answerCallbackQuery, quickActionsKeyboard } from './telegram'
import { authenticate, getCompanies, getAccounts, getDailySummary } from '../api'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export async function handleCallbackQuery(
  chatId: number,
  data: string,
  user: TelegramUser,
  callbackQueryId: string
): Promise<void> {
  // Acknowledge the button tap immediately (removes loading spinner)
  await answerCallbackQuery(callbackQueryId)

  switch (data) {
    case 'quick_balance':
      await handleQuickBalance(chatId, user)
      break
    case 'quick_summary':
      await handleQuickSummary(chatId, user)
      break
    case 'quick_income_help':
      await sendMessage(
        chatId,
        [
          '💰 <b>Log Income / កត់ត្រាចំណូល</b>',
          '',
          'Just send a message describing your income:',
          'គ្រាន់តែផ្ញើសារពិពណ៌នាចំណូលរបស់អ្នក:',
          '',
          '<b>Examples / ឧទាហរណ៍:</b>',
          '  • "sold rice $50"',
          '  • "income 200000 riel delivery"',
          '  • "លក់ទំនិញ $120"',
          '  • "ទទួលប្រាក់ 500000 រៀល"',
        ].join('\n'),
        { parseMode: 'HTML', replyMarkup: quickActionsKeyboard }
      )
      break
    case 'quick_expense_help':
      await sendMessage(
        chatId,
        [
          '💸 <b>Log Expense / កត់ត្រាចំណាយ</b>',
          '',
          'Just send a message describing your expense:',
          'គ្រាន់តែផ្ញើសារពិពណ៌នាចំណាយរបស់អ្នក:',
          '',
          '<b>Examples / ឧទាហរណ៍:</b>',
          '  • "bought supplies $30"',
          '  • "expense 80000 riel food"',
          '  • "ទិញទំនិញ $45"',
          '  • "ចំណាយ 150000 រៀល ម្ហូបអាហារ"',
        ].join('\n'),
        { parseMode: 'HTML', replyMarkup: quickActionsKeyboard }
      )
      break
    default:
      break
  }
}

async function handleQuickBalance(chatId: number, user: TelegramUser): Promise<void> {
  try {
    const auth = await authenticate(user.id, user.first_name, user.last_name, user.username)
    const companies = await getCompanies(auth.accessToken)
    if (companies.length === 0) {
      await sendMessage(chatId, 'No business found.\nមិនមានអាជីវកម្មទេ។', { replyMarkup: quickActionsKeyboard })
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
    await sendMessage(chatId, 'Failed to get balance.\nមិនអាចទាញសមតុល្យបានទេ។', { replyMarkup: quickActionsKeyboard })
  }
}

async function handleQuickSummary(chatId: number, user: TelegramUser): Promise<void> {
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
      '',
      `💰 Income / ចំណូល: <b>$${(report.total_income_cents / 100).toFixed(2)}</b>`,
      `💸 Expense / ចំណាយ: <b>$${(report.total_expense_cents / 100).toFixed(2)}</b>`,
      `${profit >= 0 ? '📈' : '📉'} Net / សុទ្ធ: <b>$${(profit / 100).toFixed(2)}</b>`,
    ]
    await sendMessage(chatId, lines.join('\n'), { parseMode: 'HTML', replyMarkup: quickActionsKeyboard })
  } catch {
    await sendMessage(chatId, 'Failed to get summary.\nមិនអាចទាញសង្ខេបបានទេ។', { replyMarkup: quickActionsKeyboard })
  }
}
