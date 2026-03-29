import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { tg } from '../lib/telegram'
import { useAuth } from '../store/auth'
import BottomNav from '../components/BottomNav'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function Report() {
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const { data: report, isLoading } = useQuery({
    queryKey: ['report-detail', companyId, month],
    queryFn: () => api.get(`/companies/${companyId}/reports/monthly?month=${month}`).then(r => r.data),
    enabled: !!companyId,
  })

  const prevMonth = () => {
    const d = new Date(month + '-01'); d.setMonth(d.getMonth() - 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const d = new Date(month + '-01'); d.setMonth(d.getMonth() + 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const maxAmount = Math.max(
    ...(report?.income_by_category?.map((c: { amount_cents: number }) => c.amount_cents) || [0]),
    ...(report?.expense_by_category?.map((c: { amount_cents: number }) => c.amount_cents) || [0]),
    1
  )

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-20 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
      <div className="flex items-center p-4">
        <button type="button" onClick={() => navigate('/')} className="text-2xl mr-3 text-gray-500 active:opacity-60">&larr;</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">របាយការណ៍ប្រចាំខែ</h1>
      </div>

      <div className="flex items-center justify-between px-4 mb-4">
        <button type="button" onClick={prevMonth} className="p-2 text-gray-400 active:text-gray-600">&larr;</button>
        <span className="font-semibold text-gray-800">{month}</span>
        <button type="button" onClick={nextMonth} className="p-2 text-gray-400 active:text-gray-600">&rarr;</button>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-4">
          <div className="h-28 bg-white rounded-2xl shadow-sm animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-white rounded-2xl shadow-sm animate-pulse" />
            <div className="h-20 bg-white rounded-2xl shadow-sm animate-pulse" />
          </div>
        </div>
      ) : report ? (
        <div className="px-4 space-y-4">
          <div className={`rounded-2xl p-6 text-center shadow-sm ${report.net_profit_cents >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
            <p className="text-sm text-gray-500 font-medium">ប្រាក់ចំណេញសុទ្ធ</p>
            <p className={`text-3xl font-bold mt-1 ${report.net_profit_cents >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${(report.net_profit_cents / 100).toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-emerald-500" />
                <p className="text-xs text-gray-400 font-medium">ចំណូលសរុប</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">${(report.total_income_cents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={16} className="text-rose-500" />
                <p className="text-xs text-gray-400 font-medium">ចំណាយសរុប</p>
              </div>
              <p className="text-xl font-bold text-rose-600">${(report.total_expense_cents / 100).toFixed(2)}</p>
            </div>
          </div>

          {report.expense_by_category?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-4">ចំណាយតាមប្រភេទ</p>
              <div className="space-y-3">
                {report.expense_by_category.map((c: { category_name_km: string; category_name: string; amount_cents: number }, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{c.category_name_km || c.category_name}</span>
                      <span className="font-semibold text-rose-600">${(c.amount_cents / 100).toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max((c.amount_cents / maxAmount) * 100, 2)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.income_by_category?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-4">ចំណូលតាមប្រភេទ</p>
              <div className="space-y-3">
                {report.income_by_category.map((c: { category_name_km: string; category_name: string; amount_cents: number }, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{c.category_name_km || c.category_name}</span>
                      <span className="font-semibold text-emerald-600">${(c.amount_cents / 100).toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max((c.amount_cents / maxAmount) * 100, 2)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 font-medium mb-1">គេជំពាក់ខ្ញុំ</p>
              <p className="text-lg font-bold text-amber-600">${(report.receivables_total_cents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 font-medium mb-1">ខ្ញុំជំពាក់គេ</p>
              <p className="text-lg font-bold text-violet-600">${(report.payables_total_cents / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  )
}
