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
    // Split raw initData into key=value pairs WITHOUT URL-decoding
    // Telegram requires data_check_string built from raw encoded values
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
        // Keep raw encoded value for data_check_string
        dataLines.push(`${key}=${rawValue}`)
        if (key === 'user') {
          // Decode user JSON for parsing
          userRaw = decodeURIComponent(rawValue)
        }
      }
    }

    if (!hash || !userRaw) return null

    // Sort alphabetically and join with newline — use raw encoded values
    dataLines.sort((a, b) => {
      const keyA = a.substring(0, a.indexOf('='))
      const keyB = b.substring(0, b.indexOf('='))
      return keyA.localeCompare(keyB)
    })
    const dataCheckString = dataLines.join('\n')

    // HMAC-SHA256 with key = HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    if (expectedHash !== hash) {
      // Debug log in development
      if (process.env.NODE_ENV !== 'production') {
        console.error('Hash mismatch:', { expected: expectedHash, received: hash, dataCheckString })
      }
      return null
    }

    return JSON.parse(userRaw) as TelegramUser
  } catch (err) {
    console.error('validateTelegramInitData error:', err)
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
