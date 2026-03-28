import WebApp from '@twa-dev/sdk'
export const tg = WebApp
export const initTelegram = () => { tg.ready(); tg.expand() }
export const haptic = {
  light: () => tg.HapticFeedback.impactOccurred('light'),
  medium: () => tg.HapticFeedback.impactOccurred('medium'),
  success: () => tg.HapticFeedback.notificationOccurred('success'),
  error: () => tg.HapticFeedback.notificationOccurred('error'),
}
