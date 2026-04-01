import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV
const envApiUrl = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_URL : undefined
const BASE_URL = envApiUrl || (isDev ? 'http://localhost:3001' : 'https://onedegree-api.tunnel.koompi.cloud')

export function useReceiptUpload() {
  const companyId = useAuthStore(s => s.companyId)
  const token = useAuthStore(s => s.token)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  /**
   * Upload a file and return the public CDN URL.
   * The file is proxied through our API server to avoid R2 CORS restrictions.
   * Optionally pass a transactionId to auto-attach the receipt.
   */
  const uploadReceipt = async (file: File, transactionId?: string): Promise<string> => {
    if (!companyId) throw new Error('No company selected')

    // 5 MB guard
    const MAX_BYTES = 5 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      throw new Error(
        `ឯកសាររបស់អ្នកធំជាង 5MB ។ សូមផ្ញើរូបភាពទៅ Telegram ជាមុន រួចរក្សាទុកជា "Compressed" ហើយព្យាយាមឡើងវិញ។\n\n` +
        `Your file exceeds 5MB. Please send the image to Telegram first, save it as "Compressed", then try again.`
      )
    }

    setUploading(true)
    setProgress(20)

    try {
      const form = new FormData()
      form.append('file', file)
      if (transactionId) form.append('transactionId', transactionId)

      setProgress(40)

      // Single request to our API — it handles the full R2 upload server-side
      const res = await fetch(
        `${BASE_URL}/companies/${companyId}/receipts/upload`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
      )

      setProgress(90)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).error || `Upload failed: ${res.status}`)
      }

      const { url } = await res.json()
      setProgress(100)
      return url
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return { uploadReceipt, uploading, progress }
}
