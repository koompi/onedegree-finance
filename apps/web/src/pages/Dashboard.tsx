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
    <div className="min-h-screen pb-32">
      <div className="p-4">
        <CompanySwitcher />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : report ? (
        <div className="px-4 space-y-4">
          <ProfitPulse netProfitCents={report.net_profit_cents} />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400">ចំណូល</p>
              <p className="text-lg font-bold text-green-600">${(report.total_income_cents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400">ចំណាយ</p>
              <p className="text-lg font-bold text-red-600">${(report.total_expense_cents / 100).toFixed(2)}</p>
            </div>
          </div>

          {report.accounts?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 mb-2">គណនី</p>
              {report.accounts.map((a: { id: string; name: string; balance_cents: number }) => (
                <div key={a.id} className="flex justify-between py-1">
                  <span className="text-sm">{a.name}</span>
                  <span className="text-sm font-medium">${(a.balance_cents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {(receivables?.length > 0 || payables?.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/receivables')} className="bg-orange-50 rounded-xl p-3 text-left border border-orange-100">
                <p className="text-xs text-orange-500">គេជំពាក់ខ្ញុំ</p>
                <p className="text-lg font-bold text-orange-600">{receivables?.length || 0}</p>
              </button>
              <button onClick={() => navigate('/payables')} className="bg-purple-50 rounded-xl p-3 text-left border border-purple-100">
                <p className="text-xs text-purple-500">ខ្ញុំជំពាក់គេ</p>
                <p className="text-lg font-bold text-purple-600">{payables?.length || 0}</p>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-12">សូមជ្រើសរើសក្រុមហ៊ុន</div>
      )}

      <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
        <button onClick={() => navigate('/transaction/new?type=income')}
          className="flex-1 bg-green-500 text-white py-3 rounded-xl font-medium text-sm">
          + ចំណូល
        </button>
        <button onClick={() => navigate('/transaction/new?type=expense')}
          className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium text-sm">
          + ចំណាយ
        </button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2">
        <button onClick={() => navigate('/')} className="text-blue-500 text-xs flex flex-col items-center">
          <span className="text-lg">🏠</span>ដើម
        </button>
        <button onClick={() => navigate('/transactions')} className="text-gray-400 text-xs flex flex-col items-center">
          <span className="text-lg">📋</span>ប្រតិបត្តិការ
        </button>
        <button onClick={() => navigate('/report')} className="text-gray-400 text-xs flex flex-col items-center">
          <span className="text-lg">📊</span>របាយការណ៍
        </button>
        <button onClick={() => navigate('/settings')} className="text-gray-400 text-xs flex flex-col items-center">
          <span className="text-lg">⚙️</span>កំណត់
        </button>
      </nav>
    </div>
  )
}
