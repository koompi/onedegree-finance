const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendMessage(chatId: number, text: string, options?: {
  parseMode?: 'HTML' | 'Markdown'
  replyMarkup?: unknown
}): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
  }
  if (options?.parseMode) body['parse_mode'] = options.parseMode
  if (options?.replyMarkup) body['reply_markup'] = options.replyMarkup

  const res = await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('sendMessage failed:', err)
  }
}

export async function getFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${TG_API}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  })

  if (!res.ok) throw new Error('Failed to get file')

  const data = await res.json() as { result: { file_path: string } }
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`
}

export async function downloadFile(fileId: string): Promise<{ buffer: ArrayBuffer; url: string }> {
  const url = await getFileUrl(fileId)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to download file')
  return { buffer: await res.arrayBuffer(), url }
}
