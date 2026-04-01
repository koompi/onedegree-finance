import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import pool from '../db/client'

const KCONSOLE_BASE = 'https://api-kconsole.koompi.cloud'
const KCONSOLE_KEY = process.env.KCONSOLE_API_KEY || 'sk_69cd42a605557083d79e6265_DG5u1eGrYTyoVa4BLJibgsV7EUZDpGva'
const CDN_BASE = 'https://storage.koompi.cloud'

type Variables = { userId: string }
const uploads = new Hono<{ Variables: Variables }>()
uploads.use('*', authMiddleware)

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const r = await pool.query('SELECT id FROM companies WHERE id = $1 AND owner_id = $2', [companyId, userId])
  return r.rows.length > 0
}

/**
 * Upload receipt — fully proxied through our server so the browser never touches R2 directly.
 * Direct browser→R2 PUT fails with CORS because the R2 bucket has no CORS policy configured.
 *
 * POST /companies/:companyId/receipts/upload   (multipart/form-data)
 *   - file          : File (required)
 *   - transactionId : string (optional) — auto-attaches receipt_url to that transaction
 * Returns: { url: string }
 */
uploads.post('/:companyId/receipts/upload', async (c) => {
  const userId = c.get('userId')
  const { companyId } = c.req.param()
  if (!await ownsCompany(userId, companyId)) return c.json({ error: 'Not found' }, 404)

  let formData: FormData
  try { formData = await c.req.formData() } catch {
    return c.json({ error: 'Expected multipart/form-data with a "file" field' }, 400)
  }

  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'Missing file field' }, 400)
  const transactionId = formData.get('transactionId') as string | null

  const filename = file.name || `receipt-${Date.now()}.jpg`
  const contentType = file.type || 'image/jpeg'
  const size = file.size

  // Step 1: Get pre-signed URL (server-side — no CORS)
  const tokenRes = await fetch(`${KCONSOLE_BASE}/api/storage/upload-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KCONSOLE_KEY },
    body: JSON.stringify({ filename, contentType, size, visibility: 'public' }),
  })
  if (!tokenRes.ok) {
    console.error('KConsole upload-token error:', await tokenRes.text())
    return c.json({ error: 'Storage service unavailable' }, 502)
  }
  const tokenData = await tokenRes.json() as {
    success: boolean
    data: { uploadUrl: string; objectId: string; key: string }
  }
  if (!tokenData.success) return c.json({ error: 'Storage token request failed' }, 502)

  const { uploadUrl, objectId, key } = tokenData.data

  // Step 2: PUT file to R2 from server (server-side — no CORS)
  const fileBuffer = await file.arrayBuffer()
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'Content-Length': String(size) },
    body: fileBuffer,
  })
  if (!putRes.ok) {
    console.error('R2 PUT error:', putRes.status, await putRes.text().catch(() => ''))
    return c.json({ error: 'Upload to storage failed' }, 502)
  }

  // Step 3: Confirm with KConsole (non-fatal if it fails)
  const completeRes = await fetch(`${KCONSOLE_BASE}/api/storage/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KCONSOLE_KEY },
    body: JSON.stringify({ objectId }),
  })
  if (!completeRes.ok) {
    console.error('KConsole complete error:', await completeRes.text())
  }

  const url = `${CDN_BASE}/${key}`

  // Auto-attach to transaction if provided
  if (transactionId) {
    await pool.query(
      'UPDATE transactions SET receipt_url = $1 WHERE id = $2 AND company_id = $3',
      [url, transactionId, companyId]
    )
  }

  return c.json({ url })
})

export default uploads
