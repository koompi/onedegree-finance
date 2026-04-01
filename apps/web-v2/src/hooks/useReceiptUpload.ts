import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'

export interface ReceiptUploadResult {
  url: string
}

export function useReceiptUpload() {
  const companyId = useAuthStore(s => s.companyId)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0) // 0-100

  /**
   * Upload a file and return the public CDN URL.
   * Optionally pass a transactionId to auto-attach the receipt on confirm.
   */
  const uploadReceipt = async (file: File, transactionId?: string): Promise<string> => {
    if (!companyId) throw new Error('No company selected')
    setUploading(true)
    setProgress(10)

    try {
      // Step 1: Get pre-signed upload URL from our backend → KConsole
      const tokenRes = await api.post<{ uploadUrl: string; objectId: string; key: string; publicUrl: string }>(
        `/${companyId}/receipts/upload-token`,
        { filename: file.name, contentType: file.type, size: file.size }
      )
      setProgress(30)

      // Step 2: PUT file directly to pre-signed R2 URL (no auth needed, key stays server-side)
      const r2Res = await fetch(tokenRes.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'Cache-Control': 'public, max-age=31536000',
        },
        body: file,
      })
      if (!r2Res.ok) throw new Error(`R2 upload failed: ${r2Res.status}`)
      setProgress(80)

      // Step 3: Confirm with our backend (marks as complete, optionally attaches to transaction)
      const completeRes = await api.post<{ url: string }>(
        `/${companyId}/receipts/complete`,
        { objectId: tokenRes.objectId, key: tokenRes.key, transactionId }
      )
      setProgress(100)

      return completeRes.url
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return { uploadReceipt, uploading, progress }
}
