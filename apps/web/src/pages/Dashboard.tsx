import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { tg, haptic } from '../lib/telegram'
import CompanySwitcher from '../components/CompanySwitcher'
import { TrendingUp, TrendingDown, AlertCircle, Lightbulb, Plus, Minus, WifiOff } from 'lucide-react'

const KHR_RATE = 4100

const TIPS = [
  'ចុះបញ្ជីចំណូលចំណាយរៀងរាល់ថ្ងៃ ដើម្បីដឹងពីស្ថានភាពអាជីវកម្មរបស់អ្នក',
  'ប្រសិនបើចំណូលច្រើនជាងចំណាយ អ្នកកំពុងទទួលបានប្រាក់ចំណេញ',
  'តាមដានអ្នកជំពាក់ប្រាក់អ្នករៀងរាល់សប្ដាហ៍ ដើម្បីជៀសវាងការខាតបង់',
  'ប្រើប្រាស់របាយការណ៍ប្រចាំខែ ដើម្បីស្នើសុំប្រាក់កម្ចីពីធនាគារ',
  'ការរក្សាទុកចំណូលចំណាយ ៦ ខែ អាចជួយអ្នកទទួលបានប្រាក់កម្ចី',
]

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }
function fmtKHR(cents: number) { return `${Math.round(cents / 100 * KHR_RATE).toLocaleString()}៛` }

export default function Dashboard() {
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on = () => setIsOffline(false)
    const off = () => setIsOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const now = new Date()
  const monthLabel = new Intl.DateTimeFormat('km-KH', { month: 'long', year: 'numeric' }).format(now)
  const todayStr = now.toISOString().slice(0, 10)
  const tipIndex = now.getDate() % TIPS.length

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

  const { data: todayTx } = useQuery({
    queryKey: ['today-tx', companyId, todayStr],
    queryFn: () => api.get(`/companies/${companyId}/transactions?limit=100`).then(r =>
      r.data.filter((t: { occurred_at: string }) => t.occurred_at.slice(0, 10) === todayStr)
    ),
    enabled: !!companyId,
  })

  const totalIncome = report?.total_income_cents || 0
  const totalExpense = report?.total_expense_cents || 0
  const netProfit = report?.net_profit_cents || 0
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0
  const maxBar = Math.max(totalIncome, totalExpense, 1)

  const recCount = receivables?.length || 0
  const recTotal = receivables?.reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0) || 0
  const payCount = payables?.length || 0

  const todayIncome = todayTx?.reduce((s: number, t: { type: string; amount_cents: number }) => t.type === 'income' ? s + t.amount_cents : s, 0) || 0
  const todayExpense = todayTx?.reduce((s: number, t: { type: string; amount_cents: number }) => t.type === 'expense' ? s + t.amount_cents : s, 0) || 0

  const totalCash = report?.accounts?.reduce((s: number, a: { balance_cents: number }) => s + a.balance_cents, 0) || 0

  const marginColor = profitMargin >= 20 ? 'text-emerald-600' : profitMargin >= 10 ? 'text-amber-600' : 'text-rose-600'

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-48 animate-fadeIn">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pb-3" style={{ paddingTop: `${safeTop + 12}px` }}>
        <div className="flex items-center justify-between">
          <CompanySwitcher />
          {isOffline && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <WifiOff size={10} /> ទិន្នន័យក្រៅបណ្ដាញ
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1 font-medium">{monthLabel}</p>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl shadow-sm animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Cash Position */}
            <div className="bg-indigo-600 rounded-2xl p-4 shadow-sm text-white">
              <p className="text-xs opacity-70 font-medium mb-1">សាច់ប្រាក់សរុប</p>
              <p className="text-3xl font-bold">{fmt(totalCash)}</p>
              <p className="text-sm opacity-70">{fmtKHR(totalCash)}</p>
            </div>

            {/* Health Score Gauge */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 font-medium mb-2">សុខភាពអាជីវកម្ម</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${profitMargin >= 20 ? 'bg-emerald-500' : profitMargin >= 10 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.max(Math.min(profitMargin, 100), 3)}%` }} />
                  </div>
                </div>
                <p className={`text-2xl font-bold shrink-0 ${marginColor}`}>{profitMargin}%</p>
              </div>
            </div>

            {/* Income vs Expense Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-gray-800">ខែនេះ</p>
                <span className={`text-sm font-bold ${marginColor}`}>
                  {netProfit >= 0 ? '+' : ''}{fmt(netProfit)} ({profitMargin}%)
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-600 font-medium flex items-center gap-1"><TrendingUp size={12}/> ចំណូល</span>
                    <span className="text-emerald-600 font-bold">{fmt(totalIncome)}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max((totalIncome / maxBar) * 100, 2)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-rose-600 font-medium flex items-center gap-1"><TrendingDown size={12}/> ចំណាយ</span>
                    <span className="text-rose-600 font-bold">{fmt(totalExpense)}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max((totalExpense / maxBar) * 100, 2)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Today Summary */}
            {(todayIncome > 0 || todayExpense > 0) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 mb-2">ថ្ងៃនេះ</p>
                <div className="flex gap-3">
                  <div className="flex-1 bg-emerald-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-emerald-600">ចំណូល</p>
                    <p className="font-bold text-emerald-700">{fmt(todayIncome)}</p>
                  </div>
                  <div className="flex-1 bg-rose-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-rose-600">ចំណាយ</p>
                    <p className="font-bold text-rose-700">{fmt(todayExpense)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Needed */}
            {recCount > 0 && (
              <button type="button" onClick={() => navigate('/receivables')}
                className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">ត្រូវប្រមូលប្រាក់</p>
                  <p className="text-xs text-amber-600">{recCount} នាក់ · {fmt(recTotal)}</p>
                </div>
                <span className="text-amber-400">→</span>
              </button>
            )}

            {/* Accounts */}
            {report?.accounts?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 font-medium mb-2">គណនី</p>
                {report.accounts.map((a: { id: string; name: string; balance_cents: number }) => (
                  <div key={a.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{a.name}</span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{fmt(a.balance_cents)}</p>
                      <p className="text-[10px] text-gray-400">{fmtKHR(a.balance_cents)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Receivables/Payables quick nav */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => navigate('/receivables')}
                className="bg-white rounded-2xl p-4 text-left shadow-sm">
                <p className="text-xs text-amber-600 font-medium mb-1">គេជំពាក់ខ្ញុំ</p>
                <p className="text-2xl font-bold text-amber-600">{recCount}</p>
              </button>
              <button type="button" onClick={() => navigate('/payables')}
                className="bg-white rounded-2xl p-4 text-left shadow-sm">
                <p className="text-xs text-violet-600 font-medium mb-1">ខ្ញុំជំពាក់គេ</p>
                <p className="text-2xl font-bold text-violet-600">{payCount}</p>
              </button>
            </div>

            {/* Daily Tip */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
              <Lightbulb size={18} className="text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-sm text-indigo-700 leading-relaxed">{TIPS[tipIndex]}</p>
            </div>
          </>
        )}
      </div>

      {/* FAB — split income/expense */}
      <div className="fixed bottom-24 left-0 right-0 px-6 flex gap-3 z-40">
        <button type="button"
          onClick={() => { haptic.medium(); navigate('/transaction/new?type=income') }}
          className="flex-1 bg-emerald-600 text-white py-3.5 rounded-2xl font-semibold text-sm shadow-lg flex items-center justify-center gap-2 active:opacity-80">
          <Plus size={18} /> ចំណូល
        </button>
        <button type="button"
          onClick={() => { haptic.medium(); navigate('/transaction/new?type=expense') }}
          className="flex-1 bg-rose-600 text-white py-3.5 rounded-2xl font-semibold text-sm shadow-lg flex items-center justify-center gap-2 active:opacity-80">
          <Minus size={18} /> ចំណាយ
        </button>
      </div>

    </div>
  )
}
