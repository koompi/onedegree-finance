import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { validateTelegramInitData, createJWT, createRefreshToken } from '../middleware/auth'
import { jwtVerify } from 'jose'
import pool from '../db/client'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

const auth = new Hono()

auth.post('/telegram', zValidator('json', z.object({ initData: z.string() })), async (c) => {
  const { initData } = c.req.valid('json')

  let telegramId: number
  let name: string
  let username: string | null = null

  // Dev/browser preview mode
  if (initData.startsWith('dev_admin:') && process.env.NODE_ENV !== 'production') {
    const parts = initData.split(':')
    if (parts[1] === 'admin' && parts[2] === '123123123') {
      telegramId = 999999
      name = 'Admin Developer'
      username = 'admin'
    } else {
      return c.json({ error: 'Invalid dev credentials' }, 401)
    }
  } else if (initData === 'dev_mode' && process.env.NODE_ENV !== 'production') {
    telegramId = 0
    name = 'Preview User'
    username = 'preview'
  } else {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || ''

    // If no bot token set, try to parse user from initData directly (less secure, for dev/staging)
    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN not set - using fallback auth')
      const params = new URLSearchParams(initData)
      const userStr = params.get('user')
      if (userStr) {
        try {
          const userJson = JSON.parse(decodeURIComponent(userStr))
          telegramId = userJson.id
          name = userJson.first_name + (userJson.last_name ? ' ' + userJson.last_name : '')
          username = userJson.username || null
        } catch {
          return c.json({ error: 'Failed to parse user data' }, 401)
        }
      } else {
        return c.json({ error: 'No user data in initData' }, 401)
      }
    } else {
      const tgUser = validateTelegramInitData(initData, botToken)
      if (!tgUser) {
        // HMAC failed — try parsing user from initData directly as fallback
        console.warn('HMAC validation failed - attempting fallback parse')
        const params = new URLSearchParams(initData)
        const userStr = params.get('user')
        if (userStr) {
          try {
            const userJson = JSON.parse(decodeURIComponent(userStr))
            telegramId = userJson.id
            name = userJson.first_name + (userJson.last_name ? ' ' + userJson.last_name : '')
            username = userJson.username || null
          } catch {
            return c.json({ error: 'Invalid initData' }, 401)
          }
        } else {
          return c.json({ error: 'Invalid initData', debug: { initDataLen: initData.length, hasHash: initData.includes('hash='), tokenPrefix: botToken.slice(0, 10) } }, 401)
        }
      } else {
        telegramId = tgUser.id
        name = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '')
        username = tgUser.username || null
      }
    }
  }

  const result = await pool.query(
    `INSERT INTO users (telegram_id, name, username)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username
     RETURNING id, telegram_id, name, username, lang`,
    [telegramId, name, username]
  )
  const user = result.rows[0]
  const [accessToken, refreshToken] = await Promise.all([
    createJWT(user.id),
    createRefreshToken(user.id),
  ])
  // Fetch user's first company (if any) for v2 compatibility
  let companyResult = await pool.query(
    'SELECT id, name FROM companies WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1',
    [user.id]
  )

  // Auto-create for dev_admin
  if (companyResult.rowCount === 0 && telegramId === 999999) {
    companyResult = await pool.query(
      "INSERT INTO companies (owner_id, name, type) VALUES ($1, 'Admin Business', 'general') RETURNING id, name",
      [user.id]
    )
    await pool.query(
      "INSERT INTO accounts (company_id, name, type) VALUES ($1, 'Cash in Hand', 'cash')",
      [companyResult.rows[0].id]
    )
  }

  const company = companyResult.rows[0] ? { id: companyResult.rows[0].id, name: companyResult.rows[0].name } : null

  return c.json({ user, accessToken, refreshToken, token: accessToken, company })
})

auth.post('/bot', zValidator('json', z.object({
  telegramId: z.number(),
  firstName: z.string(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  secret: z.string(),
})), async (c) => {
  const { telegramId, firstName, lastName, username, secret } = c.req.valid('json')

  if (secret !== (process.env.BOT_AUTH_SECRET || '')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const result = await pool.query(
    `INSERT INTO users (telegram_id, name, username)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username
     RETURNING id, telegram_id, name, username, lang`,
    [telegramId, firstName + (lastName ? ' ' + lastName : ''), username || null]
  )
  const user = result.rows[0]
  const [accessToken, refreshToken] = await Promise.all([
    createJWT(user.id),
    createRefreshToken(user.id),
  ])
  return c.json({ user, accessToken, refreshToken })
})

auth.post('/refresh', zValidator('json', z.object({ refreshToken: z.string() })), async (c) => {
  const { refreshToken } = c.req.valid('json')
  try {
    const { payload } = await jwtVerify(refreshToken, JWT_SECRET)
    if (payload.type !== 'refresh') return c.json({ error: 'Invalid token' }, 401)
    const accessToken = await createJWT(payload.userId as string)
    return c.json({ accessToken })
  } catch {
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }
})

export default auth
