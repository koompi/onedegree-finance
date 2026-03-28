import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import ProfitPulse from '../components/ProfitPulse'
import CompanySwitcher from '../components/CompanySwitcher'

export default function Dashboard() {
  const navigate = useNavigate()
  const { companyId } = useAuth()

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

  return (
    <div className="min-h-screen pb-32 bg-[#FBFBFA]">
      <div className="p-4">
        <CompanySwitcher />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : report ? (
        <div className="px-4 space-y-4">
          <ProfitPulse netProfitCents={report.net_profit_cents} />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">ចំណូល</p>
              <p className="text-xl font-bold text-emerald-600">${(report.total_income_cents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">ចំណាយ</p>
              <p className="text-xl font-bold text-rose-600">${(report.total_expense_cents / 100).toFixed(2)}</p>
            </div>
          </div>

          {report.accounts?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">គណនី</p>
              {report.accounts.map((a: { id: string; name: string; balance_cents: number }) => (
                <div key={a.id} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{a.name}</span>
                  <span className="text-sm font-medium text-gray-900">${(a.balance_cents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {(receivables?.length > 0 || payables?.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate('/receivables')}
                className="bg-amber-50 rounded-2xl p-4 text-left border border-amber-100 active:scale-[0.98] transition-all duration-200"
              >
                <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">គេជំពាក់ខ្ញុំ</p>
                <p className="text-2xl font-bold text-amber-600">{receivables?.length || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => navigate('/payables')}
                className="bg-violet-50 rounded-2xl p-4 text-left border border-violet-100 active:scale-[0.98] transition-all duration-200"
              >
                <p className="text-xs text-violet-600 uppercase tracking-wide mb-1">ខ្ញុំជំពាក់គេ</p>
                <p className="text-2xl font-bold text-violet-600">{payables?.length || 0}</p>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-12">សូមជ្រើសរើសក្រុមហ៊ុន</div>
      )}

      <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
        <button
          type="button"
          onClick={() => navigate('/transaction/new?type=income')}
          className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-medium text-sm active:scale-[0.98] transition-all duration-200 hover:bg-emerald-700"
        >
          + ចំណូល
        </button>
        <button
          type="button"
          onClick={() => navigate('/transaction/new?type=expense')}
          className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-medium text-sm active:scale-[0.98] transition-all duration-200 hover:bg-rose-700"
        >
          + ចំណាយ
        </button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-indigo-600 text-xs flex flex-col items-center gap-0.5 active:opacity-70 transition-opacity"
        >
          <span className="text-lg">🏠</span>
          <span>ដើម</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="text-gray-400 text-xs flex flex-col items-center gap-0.5 active:opacity-70 transition-opacity"
        >
          <span className="text-lg">📋</span>
          <span>ប្រតិបត្តិការ</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/report')}
          className="text-gray-400 text-xs flex flex-col items-center gap-0.5 active:opacity-70 transition-opacity"
        >
          <span className="text-lg">📊</span>
          <span>របាយការណ៍</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="text-gray-400 text-xs flex flex-col items-center gap-0.5 active:opacity-70 transition-opacity"
        >
          <span className="text-lg">⚙️</span>
          <span>កំណត់</span>
        </button>
      </nav>
    </div>
  )
}
