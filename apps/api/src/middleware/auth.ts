import { createMiddleware } from 'hono/factory'
import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export function validateTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return null
    params.delete('hash')
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
    if (expectedHash !== hash) return null
    const userStr = params.get('user')
    if (!userStr) return null
    return JSON.parse(userStr) as TelegramUser
  } catch (e) {
    console.log('[AUTH VALIDATE] exception:', e)
    return null
  }
}

export async function createJWT(userId: string, companyId?: string): Promise<string> {
  return new SignJWT({ userId, companyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(JWT_SECRET)
}

export async function createRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export const authMiddleware = createMiddleware<{
  Variables: { userId: string; companyId?: string }
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  try {
    const token = authHeader.slice(7)
    const { payload } = await jwtVerify(token, JWT_SECRET)
    c.set('userId', payload.userId as string)
    if (payload.companyId) c.set('companyId', payload.companyId as string)
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
})
