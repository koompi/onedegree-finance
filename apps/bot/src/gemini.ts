import { z } from 'zod'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const TransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'unclear']),
  amount: z.number(),
  currency: z.enum(['USD', 'KHR']),
  note: z.string(),
  note_km: z.string(),
  confidence: z.number(),
})

export type ParsedTransaction = z.infer<typeof TransactionSchema>

const PARSE_PROMPT = `You are a financial transaction parser for Cambodian SME owners.
Extract transaction data from this message (Khmer or English):
"{MESSAGE}"

Respond with JSON only:
{
  "type": "income" | "expense" | "unclear",
  "amount": number (in USD, convert if KHR at 4100 rate),
  "currency": "USD" | "KHR",
  "note": "brief description in English",
  "note_km": "brief description in Khmer",
  "confidence": 0-1
}

If unclear, set type to "unclear" and confidence below 0.5.`

async function callGemini(contents: unknown[]): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error: ${res.status} ${err}`)
  }

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
  }
  return data.candidates[0].content.parts[0].text
}

export async function parseTransaction(message: string): Promise<ParsedTransaction> {
  const prompt = PARSE_PROMPT.replace('{MESSAGE}', message)
  const raw = await callGemini([{ role: 'user', parts: [{ text: prompt }] }])

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      type: 'unclear',
      amount: 0,
      currency: 'USD',
      note: message,
      note_km: message,
      confidence: 0,
    }
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
  const result = TransactionSchema.safeParse(parsed)
  if (!result.success) {
    return {
      type: 'unclear',
      amount: 0,
      currency: 'USD',
      note: message,
      note_km: message,
      confidence: 0,
    }
  }

  return result.data
}

export async function transcribeVoice(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
  const base64Audio = Buffer.from(audioBuffer).toString('base64')

  const raw = await callGemini([
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
        {
          text: 'Transcribe this audio message. The speaker may use Khmer or English. Return only the transcribed text, nothing else.',
        },
      ],
    },
  ])

  return raw.trim()
}
