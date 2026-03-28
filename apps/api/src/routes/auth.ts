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
  const botToken = process.env.TELEGRAM_BOT_TOKEN || ''
  const tgUser = validateTelegramInitData(initData, botToken)
  if (!tgUser) return c.json({ error: 'Invalid initData' }, 401)

  const result = await pool.query(
    `INSERT INTO users (telegram_id, name, username)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username
     RETURNING id, telegram_id, name, username, lang`,
    [tgUser.id, tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : ''), tgUser.username || null]
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
