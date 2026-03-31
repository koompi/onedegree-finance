import { useState, useEffect } from 'react'
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
import { initTelegram } from './lib/telegram'

type Screen = 'dashboard' | 'transactions' | 'receivables' | 'payables' | 'inventory' | 'reports' | 'settings' | 'categories' | 'accounts' | 'companyProfile'

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [isDark, setIsDark] = useState(true)
  const { token, companyName } = useAuthStore()
  const { isLoading: authLoading, isAuthenticated, error: authError } = useAuth()

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

  const navigate = (s: Screen) => setScreen(s)
  const goBack = () => setScreen('dashboard')

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
        <div className="text-5xl mb-4">📊</div>
        <div className="text-lg font-extrabold mb-2" style={{ color: 'var(--text)' }}>OneDegree Finance</div>
        <div className="skeleton h-10 w-40 rounded-xl" />
      </div>
    )
  }

  // Auth failed
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--bg)' }}>
        <div className="text-5xl mb-4">📊</div>
        <div className="text-lg font-extrabold mb-2" style={{ color: 'var(--text)' }}>OneDegree Finance</div>
        <div className="text-sm" style={{ color: 'var(--text-sec)' }}>{authError || 'សូមបើកតាម Telegram'}</div>
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
      <Toast />
      <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
        {screen === 'dashboard' && <CompanySwitcher name={companyName || undefined} />}
        {renderScreen()}
      </div>
      <BottomNav active={['categories','accounts','companyProfile','payables'].includes(screen) ? '' : screen} onTab={(key) => navigate(key as Screen)} />
    </ErrorBoundary>
  )
}
