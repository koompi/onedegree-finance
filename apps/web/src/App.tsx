import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initTelegram, tg } from './lib/telegram'
import { setupOfflineSync } from './lib/offline'
import { useAuth } from './store/auth'
import Dashboard from './pages/Dashboard'
import AddTransaction from './pages/AddTransaction'
import TransactionList from './pages/TransactionList'
import Receivables from './pages/Receivables'
import Payables from './pages/Payables'
import Report from './pages/Report'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'
import OfflineBanner from './components/OfflineBanner'

const queryClient = new QueryClient()

export default function App() {
  const { token, login } = useAuth()
  const [autoAuthDone, setAutoAuthDone] = useState(false)

  useEffect(() => {
    initTelegram()
    setupOfflineSync()
  }, [])

  // Auto-login when launched inside Telegram with initData
  useEffect(() => {
    if (token || autoAuthDone) return
    const initData = tg.initData
    if (initData && initData.length > 0) {
      login(initData)
        .then(() => setAutoAuthDone(true))
        .catch(() => setAutoAuthDone(true))
    } else {
      setAutoAuthDone(true)
    }
  }, [token, autoAuthDone, login])

  // Show loading spinner during auto-auth
  if (!token && !autoAuthDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-5xl font-bold text-blue-600 mb-2">1°</div>
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OfflineBanner />
        <Routes>
          {!token ? (
            <Route path="*" element={<Onboarding />} />
          ) : (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transaction/new" element={<AddTransaction />} />
              <Route path="/transactions" element={<TransactionList />} />
              <Route path="/receivables" element={<Receivables />} />
              <Route path="/payables" element={<Payables />} />
              <Route path="/report" element={<Report />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
