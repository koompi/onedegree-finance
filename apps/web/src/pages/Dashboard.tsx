import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { tg } from '../lib/telegram'
import ProfitPulse from '../components/ProfitPulse'
import CompanySwitcher from '../components/CompanySwitcher'
import BottomNav from '../components/BottomNav'
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', companyId],
    queryFn: () => api.get(`/companies/${companyId}/reports/monthly`).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: receivables } = useQuery({
    queryKey: ['receivables-pending', companyId],
    queryFn: () => api.get(`/companies/${companyId}/receivables?status=pending`).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: payables } = useQuery({
    queryKey: ['payables-pending', companyId],
    queryFn: () => api.get(`/companies/${companyId}/payables?status=pending`).then(r => r.data),
    enabled: !!companyId,
  })

  const recCount = receivables?.length || 0
  const payCount = payables?.length || 0

  // Khmer month label
  let monthLabel = ''
  try {
    monthLabel = new Intl.DateTimeFormat('km-KH', { month: 'long', year: 'numeric' }).format(new Date())
  } catch {
    const now = new Date()
    monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen pb-36 bg-[#F8F7FF] animate-fadeIn">
      <div className="sticky top-0 z-30 bg-[#F8F7FF] p-4" style={{ paddingTop: `${safeTop + 16}px` }}>
        <CompanySwitcher />
        <p className="text-sm text-gray-500 mt-1">{monthLabel}</p>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-4">
          <div className="h-32 bg-white rounded-2xl shadow-sm animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-white rounded-2xl shadow-sm animate-pulse" />
            <div className="h-20 bg-white rounded-2xl shadow-sm animate-pulse" />
          </div>
          <div className="h-24 bg-white rounded-2xl shadow-sm animate-pulse" />
        </div>
      ) : report ? (
        <div className="px-4 space-y-4">
          <ProfitPulse netProfitCents={report.net_profit_cents} />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-emerald-500" />
                <p className="text-xs text-gray-400 uppercase tracking-wide">ចំណូល</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">${(report.total_income_cents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={16} className="text-rose-500" />
                <p className="text-xs text-gray-400 uppercase tracking-wide">ចំណាយ</p>
              </div>
              <p className="text-xl font-bold text-rose-600">${(report.total_expense_cents / 100).toFixed(2)}</p>
            </div>
          </div>

          {report.accounts?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">គណនី</p>
              {report.accounts.map((a: { id: string; name: string; balance_cents: number }) => (
                <div key={a.id} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{a.name}</span>
                  <span className="text-sm font-bold text-gray-900">${(a.balance_cents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => navigate('/receivables')}
              className="bg-white rounded-2xl p-4 text-left shadow-sm active:scale-[0.98] transition-all duration-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-amber-600 uppercase tracking-wide">គេជំពាក់ខ្ញុំ</p>
                {recCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{recCount}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-amber-600">{recCount}</p>
                <span className="text-gray-300">&rarr;</span>
              </div>
            </button>
            <button type="button" onClick={() => navigate('/payables')}
              className="bg-white rounded-2xl p-4 text-left shadow-sm active:scale-[0.98] transition-all duration-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-violet-600 uppercase tracking-wide">ខ្ញុំជំពាក់គេ</p>
                {payCount > 0 && (
                  <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{payCount}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-violet-600">{payCount}</p>
                <span className="text-gray-300">&rarr;</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 px-4">
          <div className="flex justify-center mb-4">
            <BarChart2 size={48} className="text-gray-300" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-1">មិនទាន់មានប្រតិបត្តិការ</p>
          <p className="text-sm text-gray-400">ចុចប៊ូតុង + ខាងក្រោមដើម្បីចាប់ផ្ដើម</p>
        </div>
      )}

      <button type="button" onClick={() => navigate('/transaction/new')}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-light active:scale-95 transition-all duration-200 hover:bg-indigo-700"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>+</button>

      <BottomNav />
    </div>
  )
}
