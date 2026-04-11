import { sendMessage, quickActionsKeyboard } from './telegram'
import { authenticate, getCompanies, getAccounts, getDailySummary, pairBotCode, redeemInvite } from '../api'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export async function handleCommand(chatId: number, command: string, user: TelegramUser, args?: string): Promise<void> {
  const baseCmd = command.split('@')[0] // strip @botname suffix
  switch (baseCmd) {
    case '/start':
      await handleStart(chatId, user, args)
      break
    case '/balance':
      await handleBalance(chatId, user)
      break
    case '/summary':
      await handleSummary(chatId, user)
      break
    case '/pair':
      await handlePair(chatId, user, args)
      break
    case '/help':
      await handleHelp(chatId)
      break
    default:
      await sendMessage(chatId, 'Unknown command. Type /help for available commands.\nពាក្យបញ្ជាមិនស្គាល់។ វាយ /help ដើម្បីមើលពាក្យបញ្ជាទាំងអស់។')
  }
}

async function handleStart(chatId: number, user: TelegramUser, args?: string): Promise<void> {
  // Handle invite link: /start inv_<token>
  if (args?.startsWith('inv_')) {
    const token = args.slice(4)
    try {
      const result = await redeemInvite(token, user.id, user.first_name, user.last_name, user.username)
      if (result.message === 'already_member') {
        await sendMessage(chatId, [
          `ℹ️ <b>You're already a member of ${result.companyName}!</b>`,
          `ℹ️ <b>អ្នកជាសមាជិករបស់ ${result.companyName} រួចហើយ!</b>`,
        ].join('\n'), { parseMode: 'HTML', replyMarkup: quickActionsKeyboard })
      } else {
        const roleLabel = result.role === 'admin' ? 'Admin' : result.role === 'manager' ? 'Manager' : 'Staff'
        await sendMessage(chatId, [
          `✅ <b>Welcome to ${result.companyName}!</b>`,
          `✅ <b>សូមស្វាគមន៍មកកាន់ ${result.companyName}!</b>`,
          ``,
          `You've joined as <b>${roleLabel}</b>. You can now log transactions for this business.`,
          `អ្នកបានចូលក្នុងនាម <b>${roleLabel}</b>។ ឥឡូវអ្នកអាចកត់ត្រាប្រតិបត្តិការបាន។`,
        ].join('\n'), { parseMode: 'HTML', replyMarkup: quickActionsKeyboard })
      }
    } catch {
      await sendMessage(chatId, [
        '❌ <b>Invalid or expired invite link.</b>',
        '❌ <b>តំណភ្ជាប់មិនត្រឹមត្រូវ ឬផុតកំណត់ហើយ។</b>',
        '',
        'Ask the company owner to generate a new invite link.',
        'សូមសុំម្ចាស់ក្រុមហ៊ុនបង្កើតតំណភ្ជាប់ថ្មី។',
      ].join('\n'), { parseMode: 'HTML' })
    }
    return
  }

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

async function handlePair(chatId: number, user: TelegramUser, args?: string): Promise<void> {
  const code = args?.trim()
  if (!code || !/^\d{6}$/.test(code)) {
    await sendMessage(chatId, [
      '🔗 <b>Pair your Telegram to OneDegree</b>',
      '🔗 <b>ភ្ជាប់ Telegram របស់អ្នកទៅ OneDegree</b>',
      '',
      '1. Open the OneDegree app',
      '   បើក OneDegree app',
      '2. Go to Settings → Telegram Bot',
      '   ទៅ ការកំណត់ → Telegram Bot',
      '3. Tap <b>Generate PIN</b> and send it here:',
      '   ចុច <b>Generate PIN</b> ហើយផ្ញើលេខនោះមកនេះ:',
      '',
      'Example: <code>/pair 123456</code>',
    ].join('\n'), { parseMode: 'HTML' })
    return
  }

  try {
    const auth = await pairBotCode(code, user.id, user.first_name, user.last_name, user.username)
    await sendMessage(chatId, [
      '✅ <b>Paired successfully! / ភ្ជាប់បានជោគជ័យ!</b>',
      '',
      'Your Telegram is now linked to your OneDegree account.',
      'Telegram របស់អ្នកឥឡូវនេះត្រូវបានភ្ជាប់ទៅគណនី OneDegree របស់អ្នក។',
    ].join('\n'), { parseMode: 'HTML', replyMarkup: quickActionsKeyboard })
    // Warm up cache with the new auth
    void auth
  } catch (e: any) {
    const msg = e.message?.includes('Invalid or expired') 
      ? 'Invalid or expired PIN. Please generate a new one in the app.\nPIN មិនត្រឹមត្រូវ ឬផុតកំណត់។ សូមបង្កើតPIN ថ្មីក្នុង app។'
      : 'Pairing failed. Please try again.\nការភ្ជាប់បរាជ័យ។ សូមព្យាយាមម្តងទៀត។'
    await sendMessage(chatId, msg)
  }
}

async function handleHelp(chatId: number): Promise<void> {
  await sendMessage(chatId, [
    '<b>OneDegree Bot Commands / ពាក្យបញ្ជា:</b>',
    '',
    '/start — Welcome / សូមស្វាគមន៍',
    '/balance — Account balances / សមតុល្យគណនី',
    '/summary — Monthly summary / សង្ខេបប្រចាំខែ',
    '/pair 123456 — Link your account / ភ្ជាប់គណនី',
    '/help — This message / សារនេះ',
    '',
    'Or just send a text/voice message to log a transaction!',
    'ឬផ្ញើសារអក្សរ/សំឡេងដើម្បីកត់ត្រាប្រតិបត្តិការ!',
  ].join('\n'), { parseMode: 'HTML', replyMarkup: quickActionsKeyboard })
}
