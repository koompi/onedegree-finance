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
    const newCompanyId = companyResult.rows[0].id
    await Promise.all([
      pool.query(
        "INSERT INTO accounts (company_id, name, type) VALUES ($1, 'Cash in Hand', 'cash')",
        [newCompanyId]
      ),
      pool.query(
        `INSERT INTO team_members (user_id, company_id, role, invited_by, active)
         VALUES ($1, $2, 'owner', $1, TRUE)
         ON CONFLICT DO NOTHING`,
        [user.id, newCompanyId]
      ),
    ])
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

// Web app: generate a pairing PIN for the bot
auth.post('/pair-code', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.slice(7)
  let userId: string
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.type === 'refresh') return c.json({ error: 'Invalid token' }, 401)
    userId = payload.userId as string
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  // Invalidate any existing unused codes for this user
  await pool.query(
    `DELETE FROM bot_pair_codes WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  )

  // Generate a random 6-digit numeric code
  const code = String(Math.floor(100000 + Math.random() * 900000))
  await pool.query(
    `INSERT INTO bot_pair_codes (user_id, code, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
    [userId, code]
  )

  return c.json({ code, expiresInMinutes: 10 })
})

// Bot: redeem a pairing PIN to link Telegram ID to a web-app user
auth.post('/pair-bot', zValidator('json', z.object({
  code: z.string(),
  telegramId: z.number(),
  firstName: z.string(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  secret: z.string(),
})), async (c) => {
  const { code, telegramId, firstName, lastName, username, secret } = c.req.valid('json')

  if (secret !== (process.env.BOT_AUTH_SECRET || '')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Look up valid (unexpired, unused) pair code
  const pairResult = await pool.query(
    `SELECT user_id FROM bot_pair_codes
     WHERE code = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [code]
  )
  if (pairResult.rowCount === 0) {
    return c.json({ error: 'Invalid or expired code' }, 400)
  }
  const { user_id } = pairResult.rows[0]

  // If another user already has this telegram_id (bot ghost user), remove it first
  await pool.query(
    `DELETE FROM users WHERE telegram_id = $1 AND id != $2`,
    [telegramId, user_id]
  )

  // Update the web-app user's telegram_id to this Telegram account
  await pool.query(
    `UPDATE users SET telegram_id = $1, name = $2, username = $3 WHERE id = $4`,
    [telegramId, firstName + (lastName ? ' ' + lastName : ''), username || null, user_id]
  )

  // Mark the code as used
  await pool.query(
    `UPDATE bot_pair_codes SET used_at = NOW() WHERE code = $1`,
    [code]
  )

  // Return auth token so bot can immediately start using the API
  const [accessToken, refreshToken] = await Promise.all([
    createJWT(user_id),
    createRefreshToken(user_id),
  ])
  return c.json({ accessToken, refreshToken })
})

auth.post('/refresh', zValidator('json', z.object({ refreshToken: z.string() })), async (c) => {
  const { refreshToken } = c.req.valid('json')
  try {
    const { payload } = await jwtVerify(refreshToken, JWT_SECRET)
    if (payload.type !== 'refresh') return c.json({ error: 'Invalid token' }, 401)
    const [accessToken, newRefreshToken] = await Promise.all([
      createJWT(payload.userId as string),
      createRefreshToken(payload.userId as string),
    ])
    return c.json({ accessToken, refreshToken: newRefreshToken })
  } catch {
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }
})

export default auth
