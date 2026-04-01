import { useState, useEffect, useRef } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import Toast from './components/Toast'
import BottomNav from './components/BottomNav'
import CompanySwitcher from './components/CompanySwitcher'
import DashboardScreen from './screens/DashboardScreen'
import TransactionsScreen from './screens/TransactionsScreen'
import ReceivablesScreen from './screens/ReceivablesScreen'
import PayablesScreen from './screens/PayablesScreen'
import InventoryScreen from './screens/InventoryScreen'
import ReportsScreen from './screens/ReportsScreen'
import SettingsScreen from './screens/SettingsScreen'
import CategoriesScreen from './sub-screens/CategoriesScreen'
import AccountsScreen from './sub-screens/AccountsScreen'
import CompanyProfileScreen from './sub-screens/CompanyProfileScreen'
import { useAuthStore } from './store/authStore'
import { useAuth } from './hooks/useAuth'
import { initTelegram, haptic } from './lib/telegram'
import { api } from './lib/api'
import { useI18nStore } from './store/i18nStore'

type Screen = 'dashboard' | 'transactions' | 'receivables' | 'payables' | 'inventory' | 'reports' | 'settings' | 'categories' | 'accounts' | 'companyProfile'

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(true)
  const { token, companyName, setAuth } = useAuthStore()
  const { isLoading: authLoading, isAuthenticated, error: authError } = useAuth()
  const t = useI18nStore(s => s.t)

  const [devUser, setDevUser] = useState('')
  const [devPass, setDevPass] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [screen])

  useEffect(() => {
    const saved = localStorage.getItem('od_theme')
    const dark = saved !== null ? saved === 'dark' : true
    setIsDark(dark)
    document.documentElement.className = dark ? 'dark' : 'light'
  }, [])

  useEffect(() => { initTelegram() }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.className = next ? 'dark' : 'light'
    localStorage.setItem('od_theme', next ? 'dark' : 'light')
  }

  const navigate = (s: Screen) => {
    haptic('light')
    setScreen(s)
  }
  const goBack = () => {
    haptic('light')
    setScreen('dashboard')
  }

  // Auth loading
  if (authLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
        <div className="text-5xl mb-4 animate-bounce">📊</div>
        <div className="text-lg font-extrabold mb-2" style={{ color: 'var(--text)' }}>{t('auth_loading_title')}</div>
        <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gold animate-progress w-1/2" style={{ background: 'var(--gold)' }} />
        </div>
      </div>
    )
  }

  // Auth failed
  if (!isAuthenticated) {
    if (import.meta.env.DEV) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center p-8 text-center overflow-y-auto" style={{ background: 'var(--bg)' }}>
          <div className="text-5xl mb-4">📊</div>
          <div className="text-lg font-extrabold mb-6" style={{ color: 'var(--text)' }}>{t('auth_dev_login_title')}</div>
          <div className="w-full max-w-xs space-y-3">
            <input
              type="text"
              placeholder={t('auth_username_placeholder')}
              value={devUser}
              onChange={e => setDevUser(e.target.value)}
              className="w-full p-4 rounded-2xl outline-none transition-all focus:ring-2 focus:ring-gold/50"
              style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
            <input
              type="password"
              placeholder={t('auth_password_placeholder')}
              value={devPass}
              onChange={e => setDevPass(e.target.value)}
              className="w-full p-4 rounded-2xl outline-none transition-all focus:ring-2 focus:ring-gold/50"
              style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
            <button
              className="w-full p-4 rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'var(--gold)', color: '#0B1120' }}
              disabled={isLoggingIn || !devUser || !devPass}
              onClick={() => {
                setIsLoggingIn(true)
                api.post<{ token: string; user: any; company: any }>('/auth/telegram', { initData: `dev_admin:${devUser}:${devPass}` })
                  .then(res => { 
                    haptic('success')
                    setAuth(res.token, res.company?.id ?? '', res.company?.name ?? '') 
                  })
                  .catch(err => { 
                    haptic('error')
                    alert(t('auth_login_failed') + ': ' + err.message) 
                  })
                  .finally(() => setIsLoggingIn(false))
              }}
            >
              {isLoggingIn ? t('auth_logging_in_btn') : t('auth_login_btn')}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--bg)' }}>
        <div className="text-5xl mb-4">📊</div>
        <div className="text-lg font-extrabold mb-2" style={{ color: 'var(--text)' }}>{t('auth_loading_title')}</div>
        <div className="text-sm px-6" style={{ color: 'var(--text-sec)' }}>{authError || t('auth_open_in_tg')}</div>
      </div>
    )
  }

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <DashboardScreen onNavigate={navigate} />
      case 'transactions': return <TransactionsScreen onBack={goBack} />
      case 'receivables': return <ReceivablesScreen onBack={goBack} />
      case 'payables': return <PayablesScreen onBack={goBack} />
      case 'inventory': return <InventoryScreen onBack={goBack} />
      case 'reports': return <ReportsScreen onBack={goBack} />
      case 'settings': return <SettingsScreen onNavigate={navigate} toggleTheme={toggleTheme} isDark={isDark} />
      case 'categories': return <CategoriesScreen onBack={goBack} />
      case 'accounts': return <AccountsScreen onBack={goBack} />
      case 'companyProfile': return <CompanyProfileScreen onBack={goBack} />
    }
  }

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 flex justify-center w-full bg-black overflow-hidden">
        <div 
          ref={scrollRef} 
          className="w-full sm:max-w-[420px] relative shadow-2xl overflow-y-auto overflow-x-hidden scroll-smooth flex flex-col" 
          style={{ background: 'var(--bg)' }}
        >
          <Toast />
          <div className="flex-1 pb-32">
            {screen === 'dashboard' && (
              <div className="sticky top-0 z-30 px-4 py-3 backdrop-blur-md" style={{ background: 'var(--nav-bg)' }}>
                <CompanySwitcher name={companyName || undefined} />
              </div>
            )}
            {renderScreen()}
          </div>
          <BottomNav active={['categories', 'accounts', 'companyProfile', 'payables'].includes(screen) ? '' : screen} onTab={(key) => navigate(key as Screen)} />
        </div>
      </div>
    </ErrorBoundary>
  )
}
