
declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp
    }
  }
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  setBackgroundColor: (color: string) => void
  setHeaderColor: (color: string) => void
  enableClosingConfirmation: () => void
  MainButton: { hide: () => void; text: string; show: () => void }
  BackButton: { show: () => void; hide: () => void; onClick: (fn: () => void) => void; offClick: (fn: () => void) => void }
  HapticFeedback: {
    impactOccurred: (type: 'light' | 'medium' | 'heavy') => void
    notificationOccurred: (type: 'success' | 'error' | 'warning') => void
  }
  onEvent: (event: string, callback: (data: { isStateStable?: boolean }) => void) => void
  offEvent: (event: string, callback: (data: { isStateStable?: boolean }) => void) => void
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string }
  }
  safeAreaInset?: { top: number; bottom: number; left: number; right: number }
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number }
  openTelegramLink: (url: string) => void
}

export function getTelegram(): TelegramWebApp | null {
  return (typeof window !== 'undefined' && window.Telegram?.WebApp) || null
}

export function isRunningInTelegram(): boolean {
  return !!getTelegram()?.initData
}

export function initTelegram(): void {
  const tg = getTelegram()
  if (!tg) return
  tg.ready()
  tg.expand()
  tg.setBackgroundColor('#0B1120')
  tg.setHeaderColor('#0B1120')
  tg.enableClosingConfirmation()
  tg.MainButton.hide()
}

export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning'): void {
  const tg = getTelegram()
  if (!tg?.HapticFeedback) return
  if (type === 'success' || type === 'error' || type === 'warning') {
    tg.HapticFeedback.notificationOccurred(type)
  } else {
    tg.HapticFeedback.impactOccurred(type)
  }
}

export function getSafeTop(): number {
  const tg = getTelegram()
  return Math.max(
    tg?.safeAreaInset?.top ?? 0,
    tg?.contentSafeAreaInset?.top ?? 0
  )
}

export function setupViewportHandling(): () => void {
  const tg = getTelegram()
  if (!tg) return () => { }

  const handler = ({ isStateStable }: { isStateStable?: boolean }) => {
    if (isStateStable) {
      const focused = document.activeElement as HTMLElement
      if (focused?.tagName === 'INPUT' || focused?.tagName === 'TEXTAREA') {
        focused.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  tg.onEvent('viewportChanged', handler)
  return () => tg.offEvent?.('viewportChanged', handler)
}

// Khmer greetings based on time
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'សួស្ដីពេលព្រឹក ✨'
  if (hour >= 12 && hour < 17) return 'សួស្ដីពេលថ្ងៃ ☀️'
  if (hour >= 17 && hour < 21) return 'សួស្ដីពេលល្ងាច 🌅'
  return 'សួស្ដីពេលយប់ 🌙'
}
