import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import AddTransactionSheet from '../components/AddTransactionSheet'
import { useDashboard } from '../hooks/useDashboard'
import { useAmount } from '../hooks/useAmount'
import { getGreeting, haptic } from '../lib/telegram'
import { useI18nStore } from '../store/i18nStore'

const QUICK = [
  { label: 'ប្រតិបត្តិការ', icon: 'transactions' as const, key: 'transactions' },
  { label: 'អ្នកជំពាក់', icon: 'receivable' as const, key: 'receivables' },
  { label: 'ស្តុកទំនិញ', icon: 'inventory' as const, key: 'inventory' },
  { label: 'របាយការណ៍', icon: 'reports' as const, key: 'reports' },
]

export default function DashboardScreen({ onNavigate }: { onNavigate: (s: any) => void }) {
  const { isLoading, transactions, monthlyData, receivablesCount, income, expense, profitMargin, getMonthLabel } = useDashboard()
  const { fmt } = useAmount()
  const [tipIdx, setTipIdx] = useState(0)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddType, setQuickAddType] = useState<'income' | 'expense'>('income')
  const t = useI18nStore(s => s.t)
  const TIPS = ['កត់ត្រារាល់ប្រតិបត្តិការជារៀងរាល់ថ្ងៃ', 'ផ្ញើរំលឹកមុនកាលកំណត់ 3 ថ្ងៃ', 'តាមដានស្តុកទំនិញជារៀងរាល់សប្ដាហ៍', 'បំបែកគណនីអាជីវកម្ម និងផ្ទាល់ខ្លួន', 'ផ្ទៀងផ្ទាត់តុល្យការជារៀងរាល់ខែ']
  useEffect(() => { const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 5000); return () => clearInterval(t) }, [])

  const recentTx = transactions.slice(0, 5)
  const maxBar = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 1)

  return (
    <div className="px-4 space-y-4 animate-fadeIn">
      <div className="mt-2">
        <div className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: 'var(--text-dim)' }}>OneDegree Finance</div>
        <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text)' }}>{getGreeting()}</div>
      </div>

      {/* Hero Card */}
      <div className="rounded-[24px] p-6 relative overflow-hidden shadow-gold" style={{ background: 'var(--gold)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="text-[11px] font-bold tracking-widest uppercase opacity-70" style={{ color: 'rgba(0,0,0,0.8)' }}>{t('total_balance')}</div>
        {isLoading ? (
          <div className="h-10 w-40 mt-1 rounded-lg animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
        ) : (
          <div className="text-4xl font-black font-mono-num mt-1" style={{ color: '#000000', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-1px' }}>{fmt(income - expense)}</div>
        )}
        <div className="flex gap-3 mt-6">
          <div className="flex-1 rounded-2xl px-4 py-3" style={{ background: 'rgba(0,0,0,0.06)' }}>
            <div className="text-[10px] font-bold uppercase opacity-60" style={{ color: '#000000' }}>{t('income')}</div>
            {isLoading ? (
              <div className="h-5 w-20 mt-0.5 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
            ) : (
              <div className="text-sm font-black font-mono-num mt-0.5" style={{ color: '#000000' }}>{fmt(income)}</div>
            )}
          </div>
          <div className="flex-1 rounded-2xl px-4 py-3" style={{ background: 'rgba(0,0,0,0.06)' }}>
            <div className="text-[10px] font-bold uppercase opacity-60" style={{ color: '#000000' }}>{t('expense')}</div>
            {isLoading ? (
              <div className="h-5 w-20 mt-0.5 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
            ) : (
              <div className="text-sm font-black font-mono-num mt-0.5" style={{ color: '#000000' }}>{fmt(expense)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Onboarding card — shown only when no data yet */}
      {!isLoading && transactions.length === 0 && income === 0 && expense === 0 && (
        <div className="rounded-[20px] p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--gold-soft) 0%, var(--card) 100%)', border: '1px solid var(--gold-med)' }}>
          <div className="absolute -bottom-6 -right-6 text-[80px] opacity-10 select-none">🚀</div>
          <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--gold)' }}>ចាប់ផ្ដើម</div>
          <div className="text-base font-black mt-1" style={{ color: 'var(--text)' }}>សូមស្វាគមន៍មកកាន់ OneDegree!</div>
          <p className="text-xs leading-relaxed mt-1.5 opacity-75" style={{ color: 'var(--text-sec)' }}>
            ចូរចុចប៊ូតុង <span className="font-bold" style={{ color: 'var(--green)' }}>ចំណូល</span> ឬ <span className="font-bold" style={{ color: 'var(--red)' }}>ចំណាយ</span> ខាងក្រោម ដើម្បីកត់ត្រាប្រតិបត្តិការដំបូងរបស់អ្នក។
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onNavigate('transactions')}
              className="px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
              style={{ background: 'var(--gold)', color: '#000' }}
            >
              + ប្រតិបត្តិការ
            </button>
          </div>
        </div>
      )}

      {/* Profit Margin */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-sec)' }}>{t('profit')}</span>
          <span className="text-xs font-bold font-mono-num" style={{ color: profitMargin >= 0 ? 'var(--green)' : 'var(--red)' }}>{profitMargin}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(Math.max(profitMargin, 3), 100)}%`, background: profitMargin >= 0 ? 'var(--green)' : 'var(--red)' }} />
        </div>
      </div>

      {/* 3-Month Bars */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-sec)' }}>{t('income_vs_expense')}</div>
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
          <div className="flex items-center gap-1 text-[10px]"><div className="w-2 h-2 rounded-sm" style={{ background: 'var(--green)' }} /><span style={{ color: 'var(--text-dim)' }}>{t('income')}</span></div>
          <div className="flex items-center gap-1 text-[10px]"><div className="w-2 h-2 rounded-sm" style={{ background: 'var(--red)' }} /><span style={{ color: 'var(--text-dim)' }}>{t('expense')}</span></div>
        </div>
      </div>

      {/* Overdue Alert */}
      {receivablesCount > 0 && (
        <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'var(--red-soft)', border: '1px solid var(--red-border)' }}>
          <Icon name="alertTriangle" size={18} color="var(--red)" />
          <div className="flex-1">
            <div className="text-xs font-bold" style={{ color: 'var(--red)' }}>{t('overdue_receivables', { count: receivablesCount })}</div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {isLoading ? (
        <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-sec)' }}>{t('recent_transactions')}</div>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="space-y-2">
                <div className="h-4 w-24 rounded animate-pulse" style={{ background: 'var(--border)' }} />
                <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              </div>
              <div className="h-5 w-20 rounded animate-pulse" style={{ background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      ) : recentTx.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-sec)' }}>{t('recent_transactions')}</div>
          {recentTx.map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{tx.category_name || tx.description || t('transaction')}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{tx.occurred_at?.substring(0, 10)}</div>
              </div>
              <div className="text-sm font-bold font-mono-num" style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount_cents)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        {QUICK.map(q => (
          <button key={q.key} onClick={() => { haptic('light'); onNavigate(q.key) }} className="rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform"
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
      <div className="fixed fab-bottom left-1/2 -translate-x-1/2 w-full sm:max-w-[400px] px-6 flex gap-3 z-40">
        <button
          onClick={() => { haptic('medium'); setQuickAddType('income'); setShowQuickAdd(true) }}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-lg"
          style={{ background: 'var(--green)', color: 'var(--bg)' }}
        >
          <Icon name="plus" size={16} /> {t('revenue')}
        </button>
        <button
          onClick={() => { haptic('medium'); setQuickAddType('expense'); setShowQuickAdd(true) }}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-lg"
          style={{ background: 'var(--red)', color: 'var(--bg)' }}
        >
          <Icon name="minus" size={16} /> {t('expense')}
        </button>
      </div>

      <AddTransactionSheet
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        defaultType={quickAddType}
        onSaved={() => onNavigate('transactions')}
      />
    </div>
  )
}
