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

function computeHmac(dataCheckString: string, botToken: string): string {
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  return crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
}

export function validateTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  try {
    // Try both approaches: raw split and URLSearchParams
    // Telegram WebApp SDK may send initData in either form
    
    // Approach 1: Split raw (preserves encoding)
    const attempt1 = tryValidateRaw(initData, botToken)
    if (attempt1) return attempt1

    // Approach 2: URLSearchParams (decoded values)
    const attempt2 = tryValidateDecoded(initData, botToken)
    if (attempt2) return attempt2

    if (process.env.NODE_ENV !== 'production') {
      console.error('Both HMAC validation approaches failed for initData:', initData.substring(0, 100))
    }
    return null
  } catch (err) {
    console.error('validateTelegramInitData error:', err)
    return null
  }
}

function tryValidateRaw(initData: string, botToken: string): TelegramUser | null {
  try {
    const pairs = initData.split('&')
    let hash: string | null = null
    const dataLines: string[] = []
    let userRaw: string | null = null

    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=')
      if (eqIdx === -1) continue
      const key = pair.substring(0, eqIdx)
      const rawValue = pair.substring(eqIdx + 1)
      if (key === 'hash') {
        hash = rawValue
      } else {
        dataLines.push(`${key}=${rawValue}`)
        if (key === 'user') userRaw = decodeURIComponent(rawValue)
      }
    }

    if (!hash || !userRaw) return null

    dataLines.sort((a, b) => a.substring(0, a.indexOf('=')).localeCompare(b.substring(0, b.indexOf('='))))
    const dataCheckString = dataLines.join('\n')
    const expectedHash = computeHmac(dataCheckString, botToken)

    if (expectedHash !== hash) return null
    return JSON.parse(userRaw) as TelegramUser
  } catch {
    return null
  }
}

function tryValidateDecoded(initData: string, botToken: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return null
    params.delete('hash')

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')

    const expectedHash = computeHmac(dataCheckString, botToken)
    if (expectedHash !== hash) return null

    const userStr = params.get('user')
    if (!userStr) return null
    return JSON.parse(userStr) as TelegramUser
  } catch {
    return null
  }
}

export async function createJWT(userId: string, companyId?: string): Promise<string> {
  return new SignJWT({ userId, companyId })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(JWT_SECRET)
}

export async function createRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
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
