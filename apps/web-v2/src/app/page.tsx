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
import { initTelegram } from './lib/telegram'

type Screen = 'dashboard' | 'transactions' | 'receivables' | 'payables' | 'inventory' | 'reports' | 'settings' | 'categories' | 'accounts' | 'companyProfile'

const TIPS = [
  '💡 កត់ត្រារាល់ប្រតិបត្តិការជារៀងរាល់ថ្ងៃ ដើម្បីមើលលំហូរសាច់ប្រាក់ច្បាស់',
  '💡 ផ្ញើរំលឹកតាម Telegram ដល់អតិថិជនដែលជំពាក់ មុនកាលកំណត់ 3 ថ្ងៃ',
  '💡 តាមដានស្តុកទំនិញជារៀងរាល់សប្ដាហ៍ ដើម្បីចៀសវាងការអស់ស្តុក',
  '💡 បំបែកគណនីអាជីវកម្ម និងគណនីផ្ទាល់ខ្លួន ដើម្បីតាមដានងាយស្រួល',
  '💡 ផ្ទៀងផ្ទាត់សំណួរតុល្យការ ជារៀងរាល់ខែ ដើម្បីត្រៀមដាក់ពាក្យខ្ចីប្រាក់',
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [isDark, setIsDark] = useState(true)
  const { token, companyName } = useAuthStore()

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

  // Auth gate
  if (!token) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--bg)' }}>
        <div className="text-5xl mb-4">📊</div>
        <div className="text-lg font-extrabold mb-2" style={{ color: 'var(--text)' }}>OneDegree Finance</div>
        <div className="text-sm mb-6" style={{ color: 'var(--text-sec)' }}>ប្រព័ន្ធគ្រប់គ្រឹងហិរញ្ញវត្ថុ SME</div>
        <div className="skeleton h-10 w-40 rounded-xl" />
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
      <div className="min-h-[100dvh] pb-24" style={{ background: 'var(--bg)' }}>
        {screen === 'dashboard' && <CompanySwitcher name={companyName || undefined} />}
        {renderScreen()}
      </div>
      <BottomNav active={screen === 'categories' || screen === 'accounts' || screen === 'companyProfile' || screen === 'payables' ? '' : screen} onTab={(key) => navigate(key as Screen)} />
    </ErrorBoundary>
  )
}
