import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initTelegram } from './lib/telegram'
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
  const { token } = useAuth()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    initTelegram()
    // Small delay to let zustand persist hydrate from localStorage
    setTimeout(() => setHydrated(true), 50)
  }, [])

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-5xl font-bold text-blue-600 mb-3">1°</div>
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
