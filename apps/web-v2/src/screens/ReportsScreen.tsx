import { useState, useEffect } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAuthStore } from '../store/authStore'
import { api, ApiError } from '../lib/api'
import { calcProfitMargin, fmtUSD, fmtKHR } from '../lib/format'
import { useAmount } from '../hooks/useAmount'
import { useCashFlow } from '../hooks/useCashFlow'
import { useI18nStore } from '../store/i18nStore'
import { toast } from '../store/toastStore'

const MONTHS_KM = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']

interface ExchangeDiff {
  category_name: string
  category_name_km?: string
  type: 'income' | 'expense'
  diff_khr: number
  diff_usd: number
}

interface CategoryItem {
  category_id: string
  category_name: string
  category_name_km?: string
  type: string
  total_usd: number
  total_khr: number
}

interface ReportData {
  income_usd: number
  expense_usd: number
  income_khr: number
  expense_khr: number
  current_exchange_rate: number
  by_category: CategoryItem[]
  exchange_differences: ExchangeDiff[]
}

export default function ReportsScreen({ onBack }: { onBack: () => void }) {
  const companyId = useAuthStore(s => s.companyId)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pl' | 'cashflow'>('pl')
  const [businessOnly, setBusinessOnly] = useState(false)
  const [viewCurrency, setViewCurrency] = useState<'USD' | 'KHR'>('USD')
  const [periodLocks, setPeriodLocks] = useState<Record<string, { locked_by: string; locked_at: string }>>({})
  const [isOwner, setIsOwner] = useState(false)
  const [locking, setLocking] = useState(false)
  const t = useI18nStore(s => s.t)
  const { fmt, currency } = useAmount()

  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const { days: cfDays, totalInflow, totalOutflow, endBalance, isLoading: cfLoading } = useCashFlow(currentMonthStr)

  const handleLockToggle = async () => {
    if (!companyId || locking) return
    setLocking(true)
    try {
      const m = `${year}-${String(month + 1).padStart(2, '0')}`
      if (periodLocks[m]) {
        await api.delete(`/${companyId}/periods/locks/${m}`)
        const newLocks = { ...periodLocks }
        delete newLocks[m]
        setPeriodLocks(newLocks)
        toast.success(t('period_unlock_success', { period: m }))
      } else {
        await api.post(`/${companyId}/periods/locks/${m}`, {})
        setPeriodLocks({ ...periodLocks, [m]: { locked_by: 'me', locked_at: new Date().toISOString() } })
        toast.success(t('period_lock_success', { period: m }))
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to toggle period lock')
    }
    setLocking(false)
  }

  // Fetch period locks and user role on mount
  useEffect(() => {
    const fetchPeriodLocks = async () => {
      if (!companyId) return
      try {
        const locks = await api.get<Array<{ month: string; locked_by: string; locked_at: string }>>(`/${companyId}/periods/locks`)
        const lockMap: Record<string, { locked_by: string; locked_at: string }> = {}
        locks.forEach(l => { lockMap[l.month] = { locked_by: l.locked_by, locked_at: l.locked_at } })
        setPeriodLocks(lockMap)
      } catch { /* ignore */ }
    }
    const fetchUserRole = async () => {
      if (!companyId) return
      try {
        const data = await api.get<{ role: string }>(`/${companyId}/members/me`)
        setIsOwner(data?.role === 'owner')
      } catch { setIsOwner(false) }
    }
    fetchPeriodLocks()
    fetchUserRole()
  }, [companyId])

  const fetchReport = async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    const m = `${year}-${String(month + 1).padStart(2, '0')}`
    try {
      const raw = await api.get<any>(`/${companyId}/reports/monthly?month=${m}${businessOnly ? '&business_only=true' : ''}`)
      setReport({
        income_usd: raw.total_income_usd ?? 0,
        expense_usd: raw.total_expense_usd ?? 0,
        income_khr: raw.total_income_khr ?? 0,
        expense_khr: raw.total_expense_khr ?? 0,
        current_exchange_rate: raw.current_exchange_rate ?? 4000,
        exchange_differences: raw.exchange_differences ?? [],
        by_category: [
          ...(raw.income_by_category || []).map((c: any) => ({
            category_id: c.category_id || c.category_name,
            category_name: c.category_name,
            category_name_km: c.category_name_km,
            type: 'income',
            total_usd: c.amount_usd ?? 0,
            total_khr: c.amount_khr ?? 0,
          })),
          ...(raw.expense_by_category || []).map((c: any) => ({
            category_id: c.category_id || c.category_name,
            category_name: c.category_name,
            category_name_km: c.category_name_km,
            type: 'expense',
            total_usd: c.amount_usd ?? 0,
            total_khr: c.amount_khr ?? 0,
          })),
        ],
      })
    } catch { setReport(null) }
    setIsLoading(false)
  }

  useEffect(() => { fetchReport() }, [companyId, year, month, businessOnly])
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1); }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1); }

  const incomeUSD = report?.income_usd || 0
  const expenseUSD = report?.expense_usd || 0
  const incomeKHR = report?.income_khr || 0
  const expenseKHR = report?.expense_khr || 0
  const income = viewCurrency === 'KHR' ? incomeKHR : incomeUSD
  const expense = viewCurrency === 'KHR' ? expenseKHR : expenseUSD
  const profit = income - expense
  const margin = calcProfitMargin(incomeUSD, expenseUSD)
  const incomeByCat = report?.by_category?.filter(c => c.type === 'income') || []
  const expenseByCat = report?.by_category?.filter(c => c.type === 'expense') || []
  const catVal = (c: CategoryItem) => viewCurrency === 'KHR' ? c.total_khr : c.total_usd
  const maxCat = Math.max(...incomeByCat.map(catVal), ...expenseByCat.map(catVal), 1)
  const exchangeDiffs = report?.exchange_differences || []
  const fmtView = (usdCents: number, khr: number) => viewCurrency === 'KHR' ? fmtKHR(khr) : fmtUSD(usdCents)

  const exportCSV = async () => {
    const m = `${year}-${String(month + 1).padStart(2, '0')}`
    try {
      await api.post(`/${companyId}/reports/export`, { month: m, type: 'excel' })
      toast.success(t('export_success'))
    } catch (e) {
      toast.error(t('export_error'))
    }
  }

  const exportPDF = async () => {
    const m = `${year}-${String(month + 1).padStart(2, '0')}`
    try {
      await api.post(`/${companyId}/reports/export`, { month: m, type: 'pdf' })
      toast.success(t('export_success'))
    } catch (e) {
      toast.error(t('export_error'))
    }
  }

  return (
    <div className="min-h-[100dvh] animate-fadeIn relative">
      <ScreenHeader title={t('nav_reports')} onBack={onBack} />
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between rounded-2xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <button onClick={() => { prevMonth(); fetchReport() }} className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90" style={{ background: 'var(--gold-soft)' }}>
            <Icon name="back" size={14} color="var(--gold)" />
          </button>
          <span className="text-sm font-extrabold flex items-center gap-1" style={{ color: 'var(--text)' }}>
            {t(`month_${month}` as any)} {year}
            {periodLocks[`${year}-${String(month + 1).padStart(2, '0')}`] && <span>🔒</span>}
          </span>
          <div className="flex items-center gap-1">
            {isOwner && (
              <button
                onClick={handleLockToggle}
                disabled={locking}
                className={`w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 ${locking ? 'opacity-50' : ''}`}
                style={{ background: periodLocks[`${year}-${String(month + 1).padStart(2, '0')}`] ? 'var(--red-soft)' : 'var(--gold-soft)' }}
              >
                <Icon name={periodLocks[`${year}-${String(month + 1).padStart(2, '0')}`] ? 'lock' : 'unlock'} size={14} color={periodLocks[`${year}-${String(month + 1).padStart(2, '0')}`] ? 'var(--red)' : 'var(--gold)'} />
              </button>
            )}
            <button onClick={() => { nextMonth(); fetchReport() }} className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90" style={{ background: 'var(--gold-soft)' }}>
              <Icon name="chevron" size={14} color="var(--gold)" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--border)' }}>
          {[{ key: 'pl', label: '📊 P&L' }, { key: 'cashflow', label: '💧 Cash Flow' }].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: activeTab === tab.key ? 'var(--card)' : 'transparent',
                color: activeTab === tab.key ? 'var(--gold)' : 'var(--text-dim)',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {(isLoading && activeTab === 'pl') || (cfLoading && activeTab === 'cashflow')
          ? <SkeletonLoader rows={4} />
          : (
          <>
            {activeTab === 'pl' && (
              <>
            {/* Business-only toggle */}
            <button
              onClick={() => setBusinessOnly(b => !b)}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                background: businessOnly ? 'var(--gold-soft)' : 'var(--border)',
                color: businessOnly ? 'var(--gold)' : 'var(--text-dim)',
                border: `1px solid ${businessOnly ? 'var(--gold-med)' : 'var(--border)'}`,
              }}
            >
              <span>💼</span>
              <span>{businessOnly ? t('tx_business') + ' Only' : 'All Transactions (incl. Personal)'}</span>
            </button>
            {/* P&L Statement */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--gold-soft)', borderBottom: '1px solid var(--gold-med)' }}>
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--gold)' }}>P&amp;L Statement</div>
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--gold-med)' }}>
                  {(['USD', 'KHR'] as const).map(vc => (
                    <button
                      key={vc}
                      onClick={() => setViewCurrency(vc)}
                      className="px-2.5 py-1 text-[10px] font-bold"
                      style={{
                        background: viewCurrency === vc ? 'var(--gold)' : 'transparent',
                        color: viewCurrency === vc ? 'var(--bg)' : 'var(--gold)',
                      }}
                    >{vc === 'USD' ? '$ USD' : '៛ KHR'}</button>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex justify-between items-start py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-sec)' }}>{t('reports_total_income')}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono-num" style={{ color: 'var(--green)' }}>+ {fmtView(incomeUSD, incomeKHR)}</div>
                    {viewCurrency === 'KHR' && incomeUSD > 0 && (
                      <div className="text-[10px] font-mono-num" style={{ color: 'var(--text-dim)' }}>${(incomeUSD / 100).toFixed(2)}</div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-start py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-sec)' }}>{t('reports_total_expense')}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono-num" style={{ color: 'var(--red)' }}>- {fmtView(expenseUSD, expenseKHR)}</div>
                    {viewCurrency === 'KHR' && expenseUSD > 0 && (
                      <div className="text-[10px] font-mono-num" style={{ color: 'var(--text-dim)' }}>${(expenseUSD / 100).toFixed(2)}</div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{t('reports_profit')}</span>
                  <div className="text-right">
                    <div className="text-base font-black font-mono-num" style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtView(incomeUSD - expenseUSD, incomeKHR - expenseKHR)}</div>
                    {viewCurrency === 'KHR' && (incomeUSD - expenseUSD) !== 0 && (
                      <div className="text-[10px] font-mono-num" style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {incomeUSD - expenseUSD >= 0 ? '+' : ''}${((incomeUSD - expenseUSD) / 100).toFixed(2)}
                      </div>
                    )}
                    <div className="text-[10px] font-bold" style={{ color: 'var(--text-dim)' }}>{t('reports_margin')}: {margin}%</div>
                  </div>
                </div>
              </div>
            </div>

            {incomeByCat.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-bold mb-3" style={{ color: 'var(--green)' }}>{t('reports_by_cat_income')}</div>
                {incomeByCat.map(c => (
                  <div key={c.category_id} className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] w-24 truncate" style={{ color: 'var(--text-sec)' }}>{c.category_name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(catVal(c) / maxCat) * 100}%`, background: 'var(--green)' }} />
                    </div>
                    <span className="text-[11px] font-bold font-mono-num" style={{ color: 'var(--text)' }}>{fmtView(c.total_usd, c.total_khr)}</span>
                  </div>
                ))}
              </div>
            )}

            {expenseByCat.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-bold mb-3" style={{ color: 'var(--red)' }}>{t('reports_by_cat_expense')}</div>
                {expenseByCat.map(c => (
                  <div key={c.category_id} className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] w-24 truncate" style={{ color: 'var(--text-sec)' }}>{c.category_name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(catVal(c) / maxCat) * 100}%`, background: 'var(--red)' }} />
                    </div>
                    <span className="text-[11px] font-bold font-mono-num" style={{ color: 'var(--text)' }}>{fmtView(c.total_usd, c.total_khr)}</span>
                  </div>
                ))}
              </div>
            )}

            {exchangeDiffs.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(228,180,75,0.08)', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--gold)' }}>{t('reports_exchange_diff')}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>1 USD = {report?.current_exchange_rate?.toLocaleString()} ៛ ({t('reports_exchange_rate_now')})</div>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {exchangeDiffs.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-sec)' }}>{d.category_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: d.type === 'income' ? 'var(--green-soft)' : 'var(--red-soft)', color: d.type === 'income' ? 'var(--green)' : 'var(--red)' }}>{d.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold font-mono-num" style={{ color: d.diff_khr >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {d.diff_khr >= 0 ? '+' : ''}{fmtKHR(Math.abs(d.diff_khr))}
                        </div>
                        <div className="text-[10px] font-mono-num" style={{ color: 'var(--text-dim)' }}>
                          {d.diff_usd >= 0 ? '+' : '-'}${(Math.abs(d.diff_usd) / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button onClick={exportCSV} className="py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95" style={{ background: 'var(--green)', color: 'var(--bg)' }}>
                <Icon name="download" size={14} /> {t('reports_export_excel')}
              </button>
              <button onClick={exportPDF} className="py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95" style={{ background: 'var(--red)', color: 'white' }}>
                <Icon name="fileText" size={14} /> {t('reports_export_pdf')}
              </button>
              <button onClick={() => { }} className="py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95" style={{ background: 'var(--blue)', color: 'white' }}>
                <Icon name="share" size={14} /> {t('reports_share')}
              </button>
            </div>

            <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #E8B84B 0%, #D4A03A 100%)' }}>
              <div className="text-[11px] font-bold" style={{ color: 'rgba(11,17,32,0.6)' }}>{t('reports_loan_title')}</div>
              <div className="text-sm font-extrabold mt-1" style={{ color: '#0B1120' }}>{t('reports_loan_desc')}</div>
              <button onClick={exportCSV} className="mt-3 px-5 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--bg)', color: 'var(--gold)' }}>{t('reports_download_btn')}</button>
            </div>
            </>
            )}

            {/* ── Cash Flow Timeline ── */}
            {activeTab === 'cashflow' && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'ចំណូល', value: totalInflow, color: 'var(--green)' },
                    { label: 'ចំណាយ', value: totalOutflow, color: 'var(--red)' },
                    { label: 'សមតុល្យ', value: endBalance, color: endBalance >= 0 ? 'var(--green)' : 'var(--red)' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-sec)' }}>{s.label}</div>
                      <div className="text-xs font-black font-mono-num" style={{ color: s.color }}>{fmt(s.value)}</div>
                    </div>
                  ))}
                </div>

                {/* Daily timeline */}
                {cfDays.length === 0 ? (
                  <div className="py-12 text-center text-sm opacity-40" style={{ color: 'var(--text-sec)' }}>មិនមានទិន្នន័យ</div>
                ) : (
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Daily Flow</div>
                    </div>
                    <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as any}>
                      {cfDays.map(d => {
                        const net = d.income - d.expense
                        const dayNum = d.day.slice(8) // DD
                        return (
                          <div key={d.day} className="flex items-center px-4 py-2.5 gap-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
                              style={{ background: net >= 0 ? 'var(--green-soft)' : 'var(--red-soft)', color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                              {dayNum}
                            </div>
                            <div className="flex-1 min-w-0">
                              {d.income > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="h-1.5 rounded-full" style={{ width: `${Math.min((d.income / Math.max(totalInflow, totalOutflow, 1)) * 120, 120)}px`, minWidth: '4px', background: 'var(--green)', opacity: 0.8 }} />
                                  <span className="text-[10px] font-semibold font-mono-num" style={{ color: 'var(--green)' }}>+{fmt(d.income)}</span>
                                </div>
                              )}
                              {d.expense > 0 && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="h-1.5 rounded-full" style={{ width: `${Math.min((d.expense / Math.max(totalInflow, totalOutflow, 1)) * 120, 120)}px`, minWidth: '4px', background: 'var(--red)', opacity: 0.8 }} />
                                  <span className="text-[10px] font-semibold font-mono-num" style={{ color: 'var(--red)' }}>-{fmt(d.expense)}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-[11px] font-bold font-mono-num shrink-0" style={{ color: d.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                              {fmt(d.balance)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
