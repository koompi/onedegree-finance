import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { handleTextMessage } from './handlers/message'
import { handleVoiceMessage } from './handlers/voice'
import { handleCommand } from './handlers/commands'
import { handleCallbackQuery } from './handlers/callback'
import { startDailyCron } from './cron'

const app = new Hono()
const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET ?? ''

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
    chat: { id: number }
    text?: string
    voice?: { file_id: string; duration: number; mime_type?: string }
  }
  callback_query?: {
    id: string
    from: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
    message?: { chat: { id: number }; message_id: number }
    data?: string
  }
}

app.get('/health', (c) => c.json({ status: 'ok' }))

app.post('/webhook', async (c) => {
  if (WEBHOOK_SECRET) {
    const secret = c.req.header('X-Telegram-Bot-Api-Secret-Token')
    if (secret !== WEBHOOK_SECRET) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }

  const update = await c.req.json<TelegramUpdate>()

  // Handle inline keyboard button taps
  if (update.callback_query) {
    const { callback_query } = update
    const chatId = callback_query.message?.chat.id
    const user = callback_query.from
    if (chatId) {
      try {
        await handleCallbackQuery(chatId, callback_query.data ?? '', user, callback_query.id)
      } catch (err) {
        console.error('Error handling callback_query:', err)
      }
    }
    return c.json({ ok: true })
  }

  if (!update.message) {
    return c.json({ ok: true })
  }

  const { message } = update
  const chatId = message.chat.id
  const user = message.from

  try {
    if (message.voice) {
      await handleVoiceMessage(chatId, message.voice.file_id, user)
    } else if (message.text) {
      if (message.text.startsWith('/')) {
        const command = message.text.split(' ')[0].split('@')[0]
        await handleCommand(chatId, command, user)
      } else {
        await handleTextMessage(chatId, message.text, user)
      }
    }
  } catch (err) {
    console.error('Error handling update:', err)
  }

  return c.json({ ok: true })
})

const PORT = parseInt(process.env.PORT ?? '3002')

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`OneDegree Bot running on port ${PORT}`)
  startDailyCron()
})
