import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { fmtKHR } from '../lib/format'
import { useDashboard } from '../hooks/useDashboard'
import { getGreeting } from '../lib/telegram'

const QUICK = [
  { label: 'ប្រតិបត្តិការ', icon: 'transactions' as const, key: 'transactions' },
  { label: 'អ្នកជំពាក់', icon: 'receivable' as const, key: 'receivables' },
  { label: 'ស្តុកទំនិញ', icon: 'inventory' as const, key: 'inventory' },
  { label: 'របាយការណ៍', icon: 'reports' as const, key: 'reports' },
]

export default function DashboardScreen({ onNavigate }: { onNavigate: (s: any) => void }) {
  const { isLoading, transactions, monthlyData, receivablesCount, income, expense, profitMargin, getMonthLabel } = useDashboard()
  const [tipIdx, setTipIdx] = useState(0)
  const TIPS = ['កត់ត្រារាល់ប្រតិបត្តិការជារៀងរាល់ថ្ងៃ', 'ផ្ញើរំលឹកមុនកាលកំណត់ 3 ថ្ងៃ', 'តាមដានស្តុកទំនិញជារៀងរាល់សប្ដាហ៍', 'បំបែកគណនីអាជីវកម្ម និងផ្ទាល់ខ្លួន', 'ផ្ទៀងផ្ទាត់តុល្យការជារៀងរាល់ខែ']
  useEffect(() => { const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 5000); return () => clearInterval(t) }, [])

  const recentTx = transactions.slice(0, 5)
  const maxBar = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 1)

  return (
    <div className="px-4 pt-4 space-y-3 animate-fadeIn">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>OneDegree Finance</div>
        <div className="text-lg font-extrabold mt-0.5" style={{ color: 'var(--text)' }}>{getGreeting()}</div>
      </div>

      {/* Hero Card */}
      <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #E8B84B 0%, #D4A03A 100%)' }}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="text-[11px] font-bold tracking-wider" style={{ color: 'rgba(11,17,32,0.6)' }}>សាច់ប្រាក់សរុប</div>
        <div className="text-[28px] font-black font-mono-num mt-1" style={{ color: '#0B1120', fontFamily: "'JetBrains Mono', monospace" }}>{isLoading ? '...' : fmtKHR(income - expense)}</div>
        <div className="flex gap-2 mt-4">
          <div className="flex-1 rounded-xl px-3 py-2" style={{ background: 'rgba(11,17,32,0.12)' }}>
            <div className="text-[11px]" style={{ color: 'rgba(11,17,32,0.6)' }}>ចំណូល</div>
            <div className="text-sm font-extrabold font-mono-num" style={{ color: '#0B1120' }}>{isLoading ? '...' : fmtKHR(income)}</div>
          </div>
          <div className="flex-1 rounded-xl px-3 py-2" style={{ background: 'rgba(11,17,32,0.12)' }}>
            <div className="text-[11px]" style={{ color: 'rgba(11,17,32,0.6)' }}>ចំណាយ</div>
            <div className="text-sm font-extrabold font-mono-num" style={{ color: '#0B1120' }}>{isLoading ? '...' : fmtKHR(expense)}</div>
          </div>
        </div>
      </div>

      {/* Profit Margin */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-sec)' }}>ប្រាក់ចំណេញ</span>
          <span className="text-xs font-bold font-mono-num" style={{ color: profitMargin >= 0 ? 'var(--green)' : 'var(--red)' }}>{profitMargin}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(Math.max(profitMargin, 3), 100)}%`, background: profitMargin >= 0 ? 'var(--green)' : 'var(--red)' }} />
        </div>
      </div>

      {/* 3-Month Bars */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-sec)' }}>ចំណូល vs ចំណាយ</div>
        <div className="flex items-end justify-around h-20 gap-4">
          {monthlyData.map(m => (
            <div key={m.month} className="flex items-end gap-1">
              <div className="w-4 rounded-t-sm transition-all duration-500" style={{ height: `${maxBar > 0 ? (m.income / maxBar) * 60 : 0}px`, background: 'var(--green)', opacity: 0.8 }} />
              <div className="w-4 rounded-t-sm transition-all duration-500" style={{ height: `${maxBar > 0 ? (m.expense / maxBar) * 60 : 0}px`, background: 'var(--red)', opacity: 0.8 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-around mt-2">
          {monthlyData.map(m => (
            <span key={m.month} className="text-[9px] font-semibold" style={{ color: 'var(--text-dim)' }}>{getMonthLabel(m.month).substring(0, 3)}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2 justify-center">
          <div className="flex items-center gap-1 text-[10px]"><div className="w-2 h-2 rounded-sm" style={{ background: 'var(--green)' }} /><span style={{ color: 'var(--text-dim)' }}>ចំណូល</span></div>
          <div className="flex items-center gap-1 text-[10px]"><div className="w-2 h-2 rounded-sm" style={{ background: 'var(--red)' }} /><span style={{ color: 'var(--text-dim)' }}>ចំណាយ</span></div>
        </div>
      </div>

      {/* Overdue Alert */}
      {receivablesCount > 0 && (
        <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'var(--red-soft)', border: '1px solid var(--red-border)' }}>
          <Icon name="alertTriangle" size={18} color="var(--red)" />
          <div className="flex-1">
            <div className="text-xs font-bold" style={{ color: 'var(--red)' }}>មានជំពាក់ហួសកំណត់ {receivablesCount} នាក់</div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {!isLoading && recentTx.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-sec)' }}>ប្រតិបត្តិការថ្មីបំផុត</div>
          {recentTx.map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{tx.category_name || tx.description || 'ប្រតិបត្តិការ'}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{tx.occurred_at?.substring(0, 10)}</div>
              </div>
              <div className="text-sm font-bold font-mono-num" style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {tx.type === 'income' ? '+' : '-'}{fmtKHR(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        {QUICK.map(q => (
          <button key={q.key} onClick={() => onNavigate(q.key)} className="rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <Icon name={q.icon} size={18} color="var(--gold)" />
            <div className="text-xs font-semibold mt-1.5" style={{ color: 'var(--text)' }}>{q.label}</div>
          </button>
        ))}
      </div>

      {/* Tips */}
      <div className="rounded-2xl p-4 flex gap-3" style={{ background: 'var(--gold-soft)', border: '1px solid var(--gold-med)' }}>
        <span className="shrink-0 text-lg">💡</span>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--gold)' }}>{TIPS[tipIdx]}</p>
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 left-0 right-0 px-6 flex gap-3 z-40">
        <button onClick={() => onNavigate('transactions')} className="flex-1 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-lg"
          style={{ background: 'var(--green)', color: 'var(--bg)' }}>
          <Icon name="plus" size={16} /> ចំណូល
        </button>
        <button onClick={() => onNavigate('transactions')} className="flex-1 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-lg"
          style={{ background: 'var(--red)', color: 'var(--bg)' }}>
          <Icon name="minus" size={16} /> ចំណាយ
        </button>
      </div>
    </div>
  )
}
