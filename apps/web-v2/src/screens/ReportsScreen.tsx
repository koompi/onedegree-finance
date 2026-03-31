import { useState, useEffect } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'
import { fmtKHR, calcProfitMargin } from '../lib/format'

const MONTHS_KM = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']

interface ReportData { income: number; expense: number; by_category: Array<{ category_id: string; category_name: string; type: string; total: number }> }

export default function ReportsScreen({ onBack }: { onBack: () => void }) {
  const companyId = useAuthStore(s => s.companyId)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchReport = async () => {
    if (!companyId) return
    setIsLoading(true)
    const m = `${year}-${String(month + 1).padStart(2, '0')}`
    try { setReport(await api.get<ReportData>(`/${companyId}/reports/monthly?month=${m}`)) }
    catch { setReport(null) }
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
    csv += `របាយការណ៍ខែ ${MONTHS_KM[month]} ${year}\n\n`
    csv += `ចំណូលសរុប,${income}\n`
    csv += `ចំណាយសរុប,${expense}\n`
    csv += `សេចក្តីផល,${profit}\n\n`
    csv += `ប្រភេទចំណូល,ចំនួន\n`
    incomeByCat.forEach(c => { csv += `${c.category_name},${c.total}\n` })
    csv += `\nប្រភេទចំណាយ,ចំនួន\n`
    expenseByCat.forEach(c => { csv += `${c.category_name},${c.total}\n` })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `report-${m}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const m = `${year}-${String(month + 1).padStart(2, '0')}`
    let text = `របាយការណ៍ហិរញ្ញវត្ថុ - ${MONTHS_KM[month]} ${year}\n\n`
    text += `ចំណូលសរុប: ${fmtKHR(income)}\n`
    text += `ចំណាយសរុប: ${fmtKHR(expense)}\n`
    text += `សេចក្តីផល: ${fmtKHR(profit)} (${margin}%)\n\n`
    text += `ចំណូលតាមប្រភេទ:\n`
    incomeByCat.forEach(c => { text += `  ${c.category_name}: ${fmtKHR(c.total)}\n` })
    text += `\nចំណាយតាមប្រភេទ:\n`
    expenseByCat.forEach(c => { text += `  ${c.category_name}: ${fmtKHR(c.total)}\n` })
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `report-${m}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen animate-fadeIn">
      <ScreenHeader title="របាយការណ៍" onBack={onBack} />
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between rounded-2xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <button onClick={() => { prevMonth(); fetchReport() }} className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90" style={{ background: 'var(--gold-soft)' }}>
            <Icon name="back" size={14} color="var(--gold)" />
          </button>
          <span className="text-sm font-extrabold" style={{ color: 'var(--text)' }}>{MONTHS_KM[month]} {year}</span>
          <button onClick={() => { nextMonth(); fetchReport() }} className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90" style={{ background: 'var(--gold-soft)' }}>
            <Icon name="chevron" size={14} color="var(--gold)" />
          </button>
        </div>

        {isLoading ? <SkeletonLoader rows={4} /> : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'ចំណូលសរុប', val: fmtKHR(income), color: 'var(--green)' },
                { label: 'ចំណាយសរុប', val: fmtKHR(expense), color: 'var(--red)' },
                { label: 'សេចក្តីផល', val: fmtKHR(profit), color: profit >= 0 ? 'var(--green)' : 'var(--red)' },
                { label: 'អត្រាផល', val: `${margin}%`, color: 'var(--blue)' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3.5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--text-dim)' }}>{s.label}</div>
                  <div className="text-base font-extrabold font-mono-num mt-0.5" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {incomeByCat.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-bold mb-3" style={{ color: 'var(--green)' }}>ចំណូលតាមប្រភេទ</div>
                {incomeByCat.map(c => (
                  <div key={c.category_id} className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] w-24 truncate" style={{ color: 'var(--text-sec)' }}>{c.category_name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(c.total / maxCat) * 100}%`, background: 'var(--green)' }} />
                    </div>
                    <span className="text-[11px] font-bold font-mono-num" style={{ color: 'var(--text)' }}>{fmtKHR(c.total)}</span>
                  </div>
                ))}
              </div>
            )}

            {expenseByCat.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-bold mb-3" style={{ color: 'var(--red)' }}>ចំណាយតាមប្រភេទ</div>
                {expenseByCat.map(c => (
                  <div key={c.category_id} className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] w-24 truncate" style={{ color: 'var(--text-sec)' }}>{c.category_name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(c.total / maxCat) * 100}%`, background: 'var(--red)' }} />
                    </div>
                    <span className="text-[11px] font-bold font-mono-num" style={{ color: 'var(--text)' }}>{fmtKHR(c.total)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button onClick={exportCSV} className="py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95" style={{ background: 'var(--green)', color: 'var(--bg)' }}>
                <Icon name="download" size={14} /> Excel
              </button>
              <button onClick={exportPDF} className="py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95" style={{ background: 'var(--red)', color: 'white' }}>
                <Icon name="fileText" size={14} /> PDF
              </button>
              <button onClick={() => { }} className="py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95" style={{ background: 'var(--blue)', color: 'white' }}>
                <Icon name="share" size={14} /> ចែករំលែក
              </button>
            </div>

            <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #E8B84B 0%, #D4A03A 100%)' }}>
              <div className="text-[11px] font-bold" style={{ color: 'rgba(11,17,32,0.6)' }}>ត្រៀមដាក់ពាក្យខ្ចីប្រាក់</div>
              <div className="text-sm font-extrabold mt-1" style={{ color: '#0B1120' }}>ទាញយករបាយការណ៍ដែលហាមឌេកតាមធនាគារ</div>
              <button onClick={exportCSV} className="mt-3 px-5 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--bg)', color: 'var(--gold)' }}>ទាញយក</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
