import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

const KCONSOLE_BASE = 'https://api-kconsole.koompi.cloud'
const KCONSOLE_KEY = process.env.KCONSOLE_API_KEY || 'sk_69cd42a605557083d79e6265_DG5u1eGrYTyoVa4BLJibgsV7EUZDpGva'
const CDN_BASE = 'https://kconsole-storage.koompi.cloud'

type Variables = { userId: string }
const uploads = new Hono<{ Variables: Variables }>()
uploads.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query('SELECT id FROM companies WHERE id = $1 AND owner_id = $2', [companyId, userId])
  return r.rows.length > 0
}

/**
 * Step 1 — Request a pre-signed upload URL from KConsole
 * POST /companies/:companyId/receipts/upload-token
 * Body: { filename: string, size: number, contentType: string }
 * Returns: { uploadUrl, objectId, key }
 */
uploads.post('/:companyId/receipts/upload-token', async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  let body: { filename?: string; size?: number; contentType?: string }
  try { body = await c.req.json() } catch { body = {} }

  const filename = body.filename || `receipt-${Date.now()}.jpg`
  const contentType = body.contentType || 'image/jpeg'
  const size = body.size || 0

  const res = await fetch(`${KCONSOLE_BASE}/api/storage/upload-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KCONSOLE_KEY },
    body: JSON.stringify({ filename, contentType, size, visibility: 'public' }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('KConsole upload-token error:', err)
    return c.json({ error: 'Storage service unavailable' }, 502)
  }

  const data = await res.json() as { success: boolean; data: { uploadUrl: string; objectId: string; key: string } }
  if (!data.success) return c.json({ error: 'Storage token request failed' }, 502)

  return c.json({
    uploadUrl: data.data.uploadUrl,
    objectId: data.data.objectId,
    key: data.data.key,
    publicUrl: `${CDN_BASE}/${data.data.key}`,
  })
})

/**
 * Step 2 — Confirm upload + optionally attach to a transaction
 * POST /companies/:companyId/receipts/complete
 * Body: { objectId: string, key: string, transactionId?: string }
 * Returns: { url }
 */
uploads.post('/:companyId/receipts/complete', async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json<{ objectId: string; key: string; transactionId?: string }>()
  if (!body.objectId) return c.json({ error: 'objectId required' }, 400)

  // Confirm with KConsole
  const res = await fetch(`${KCONSOLE_BASE}/api/storage/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KCONSOLE_KEY },
    body: JSON.stringify({ objectId: body.objectId }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('KConsole complete error:', err)
    return c.json({ error: 'Storage confirm failed' }, 502)
  }

  const url = `${CDN_BASE}/${body.key}`

  // Attach to transaction if provided
  if (body.transactionId) {
    await pool.query(
      'UPDATE transactions SET receipt_url = $1 WHERE id = $2 AND company_id = $3',
      [url, body.transactionId, companyId]
    )
  }

  return c.json({ url })
})

export default uploads
