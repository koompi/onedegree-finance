import { useState, useEffect } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'
import { calcProfitMargin } from '../lib/format'
import { useAmount } from '../hooks/useAmount'
import { useCashFlow } from '../hooks/useCashFlow'
import { useI18nStore } from '../store/i18nStore'

const MONTHS_KM = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']

interface ReportData { income: number; expense: number; by_category: Array<{ category_id: string; category_name: string; type: string; total: number }> }

export default function ReportsScreen({ onBack }: { onBack: () => void }) {
  const companyId = useAuthStore(s => s.companyId)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pl' | 'cashflow'>('pl')
  const t = useI18nStore(s => s.t)
  const { fmt, currency } = useAmount()

  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const { days: cfDays, totalInflow, totalOutflow, endBalance, isLoading: cfLoading } = useCashFlow(currentMonthStr)

  const fetchReport = async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    const m = `${year}-${String(month + 1).padStart(2, '0')}`
    try {
      const raw = await api.get<any>(`/${companyId}/reports/monthly?month=${m}`)
      setReport({
        income: raw.total_income_cents ?? raw.income ?? 0,
        expense: raw.total_expense_cents ?? raw.expense ?? 0,
        by_category: [
          ...(raw.income_by_category || []).map((c: any) => ({
            category_id: c.category_id || c.category_name,
            category_name: c.category_name,
            type: 'income',
            total: c.amount_cents ?? c.total ?? 0,
          })),
          ...(raw.expense_by_category || []).map((c: any) => ({
            category_id: c.category_id || c.category_name,
            category_name: c.category_name,
            type: 'expense',
            total: c.amount_cents ?? c.total ?? 0,
          })),
        ],
      })
    } catch { setReport(null) }
    setIsLoading(false)
  }

  useEffect(() => { fetchReport() }, [companyId, year, month])
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1); }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1); }

  const income = report?.income || 0
  const expense = report?.expense || 0
  const profit = income - expense
  const margin = calcProfitMargin(income, expense)
  const incomeByCat = report?.by_category?.filter(c => c.type === 'income') || []
  const expenseByCat = report?.by_category?.filter(c => c.type === 'expense') || []
  const maxCat = Math.max(...incomeByCat.map(c => c.total), ...expenseByCat.map(c => c.total), 1)

  const exportCSV = () => {
    const m = `${year}-${String(month + 1).padStart(2, '0')}`
    let csv = '\uFEFF' // BOM for Khmer
    csv += `${t('nav_reports')} ${t(`month_${month}` as any)} ${year}\n\n`
    csv += `${t('reports_total_income')},${income}\n`
    csv += `${t('reports_total_expense')},${expense}\n`
    csv += `${t('reports_profit')},${profit}\n\n`
    csv += `${t('reports_by_cat_income')},ចំនួន\n`
    incomeByCat.forEach(c => { csv += `${c.category_name},${c.total}\n` })
    csv += `\n${t('reports_by_cat_expense')},ចំនួន\n`
    expenseByCat.forEach(c => { csv += `${c.category_name},${c.total}\n` })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `report-${m}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const m = `${year}-${String(month + 1).padStart(2, '0')}`
    let text = `${t('nav_reports')} - ${t(`month_${month}` as any)} ${year}\n\n`
    text += `${t('reports_total_income')}: ${fmt(income)}\n`
    text += `${t('reports_total_expense')}: ${fmt(expense)}\n`
    text += `${t('reports_profit')}: ${fmt(profit)} (${margin}%)\n\n`
    text += `${t('reports_by_cat_income')}:\n`
    incomeByCat.forEach(c => { text += `  ${c.category_name}: ${fmt(c.total)}\n` })
    text += `\n${t('reports_by_cat_expense')}:\n`
    expenseByCat.forEach(c => { text += `  ${c.category_name}: ${fmt(c.total)}\n` })
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `report-${m}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-[100dvh] animate-fadeIn relative">
      <ScreenHeader title={t('nav_reports')} onBack={onBack} />
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between rounded-2xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <button onClick={() => { prevMonth(); fetchReport() }} className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90" style={{ background: 'var(--gold-soft)' }}>
            <Icon name="back" size={14} color="var(--gold)" />
          </button>
          <span className="text-sm font-extrabold" style={{ color: 'var(--text)' }}>{t(`month_${month}` as any)} {year}</span>
          <button onClick={() => { nextMonth(); fetchReport() }} className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90" style={{ background: 'var(--gold-soft)' }}>
            <Icon name="chevron" size={14} color="var(--gold)" />
          </button>
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
            {/* P&L Statement */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3" style={{ background: 'var(--gold-soft)', borderBottom: '1px solid var(--gold-med)' }}>
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--gold)' }}>P&amp;L Statement</div>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-sec)' }}>{t('reports_total_income')}</span>
                  <span className="text-sm font-bold font-mono-num" style={{ color: 'var(--green)' }}>+ {fmt(income)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-sec)' }}>{t('reports_total_expense')}</span>
                  <span className="text-sm font-bold font-mono-num" style={{ color: 'var(--red)' }}>- {fmt(expense)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{t('reports_profit')}</span>
                  <div className="text-right">
                    <div className="text-base font-black font-mono-num" style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(profit)}</div>
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
                      <div className="h-full rounded-full" style={{ width: `${(c.total / maxCat) * 100}%`, background: 'var(--green)' }} />
                    </div>
                    <span className="text-[11px] font-bold font-mono-num" style={{ color: 'var(--text)' }}>{fmt(c.total)}</span>
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
                      <div className="h-full rounded-full" style={{ width: `${(c.total / maxCat) * 100}%`, background: 'var(--red)' }} />
                    </div>
                    <span className="text-[11px] font-bold font-mono-num" style={{ color: 'var(--text)' }}>{fmt(c.total)}</span>
                  </div>
                ))}
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
