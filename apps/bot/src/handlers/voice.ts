import { transcribeVoice } from '../gemini'
import { handleTextMessage } from './message'
import { sendMessage, downloadFile } from './telegram'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export async function handleVoiceMessage(chatId: number, fileId: string, user: TelegramUser): Promise<void> {
  await sendMessage(chatId, 'Listening... / កំពុងស្ដាប់...')

  const { buffer } = await downloadFile(fileId)
  const transcribed = await transcribeVoice(buffer, 'audio/ogg')

  if (!transcribed || transcribed.length === 0) {
    await sendMessage(chatId, "Couldn't understand the audio. Please try again.\nមិនអាចយល់សំឡេងបានទេ។ សូមព្យាយាមម្ដងទៀត។")
    return
  }

  await sendMessage(chatId, `Heard: "${transcribed}"`)
  await handleTextMessage(chatId, transcribed, user)
}
