import { useState, useMemo, useEffect } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Pill from '../components/Pill'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import ListItem from '../components/ListItem'
import AddTransactionSheet from '../components/AddTransactionSheet'
import { useTransactions } from '../hooks/useTransactions'
import { useAmount } from '../hooks/useAmount'
import { fmtDateKhmer } from '../lib/format'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'
import { useI18nStore } from '../store/i18nStore'
import { useAuthStore } from '../store/authStore'
import { api, ApiError } from '../lib/api'

export default function TransactionsScreen({ onBack }: { onBack: () => void }) {
  const t = useI18nStore(s => s.t)
  const { companyId } = useAuthStore()
  const [periodLocks, setPeriodLocks] = useState<Record<string, { locked_by: string; locked_at: string }>>({})
  const [isOwner, setIsOwner] = useState(false)
  const [locking, setLocking] = useState(false)
  const FILTERS = [
    { key: 'all', label: t('tx_filter_all') },
    { key: 'income', label: t('tx_filter_income') },
    { key: 'expense', label: t('tx_filter_expense') },
  ]
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedTx, setSelectedTx] = useState<import('../hooks/useTransactions').Transaction | null>(null)

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { isLoading, transactions, remove, refetch } = useTransactions(month, filter)
  const { fmt } = useAmount()

  const handleLockToggle = async () => {
    if (!companyId || locking) return
    setLocking(true)
    try {
      if (periodLocks[month]) {
        await api.delete(`/${companyId}/periods/locks/${month}`)
        const newLocks = { ...periodLocks }
        delete newLocks[month]
        setPeriodLocks(newLocks)
        toast.success(t('period_unlock_success', { period: month }))
      } else {
        await api.post(`/${companyId}/periods/locks/${month}`, {})
        setPeriodLocks({ ...periodLocks, [month]: { locked_by: 'me', locked_at: new Date().toISOString() } })
        toast.success(t('period_lock_success', { period: month }))
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


  const grouped = useMemo(() => {
    let txs = transactions
    if (search) txs = txs.filter(t => (t.category_name || t.description || '').toLowerCase().includes(search.toLowerCase()))
    const groups: Record<string, typeof txs> = {}
    txs.forEach(t => { const d = t.occurred_at?.substring(0, 10) || ''; (groups[d] = groups[d] || []).push(t) })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [transactions, search])

  const handleDelete = async () => {
    if (!deleteId) return
    haptic('error')
    try {
      await remove(deleteId)
      toast.success(t('tx_deleted_success'))
      setDeleteId(null)
    } catch (e: any) {
      if (e instanceof ApiError && e.code === 'PeriodLocked') {
        toast.error(t('period_locked_error', { period: month }))
      } else {
        toast.error(e.message || 'Failed to delete transaction')
      }
    }
  }

  if (isLoading) return (
    <div className="min-h-[100dvh] animate-fadeIn">
      <ScreenHeader title={t('nav_transactions')} onBack={onBack} />
      <div className="px-4 pt-3"><SkeletonLoader rows={6} /></div>
    </div>
  )

  return (
    <div className="min-h-[100dvh] pb-32 animate-fadeIn relative">
      <div className="sticky top-0 z-30">
        <ScreenHeader title={t('nav_transactions')} onBack={onBack}
          right={
            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  onClick={handleLockToggle}
                  disabled={locking}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${locking ? 'opacity-50' : ''}`}
                  style={{ background: periodLocks[month] ? 'var(--red-soft)' : 'var(--gold-soft)' }}
                >
                  <Icon name={periodLocks[month] ? 'lock' : 'unlock'} size={16} color={periodLocks[month] ? 'var(--red)' : 'var(--gold)'} />
                </button>
              )}
              {periodLocks[month] && !isOwner && (
                <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
                  🔒
                </span>
              )}
              <button onClick={() => { haptic('light'); setSearchOpen(!searchOpen) }} className="w-10 h-10 flex items-center justify-center rounded-2xl active:bg-white/5 transition-all"><Icon name="search" size={20} color="var(--text-sec)" /></button>
            </div>
          }
        />
      </div>
      
      <div className="px-4 space-y-4 pt-2">
        {searchOpen && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all focus-within:ring-2 focus-within:ring-gold/20" 
               style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <Icon name="search" size={16} color="var(--gold)" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('tx_search_placeholder')}
              className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold"
              style={{ color: 'var(--text)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-1 opacity-50 hover:opacity-100">
                <Icon name="close" size={14} color="var(--text-dim)" />
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { haptic('light'); setFilter(f.key) }}
              className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                filter === f.key ? 'shadow-gold' : 'opacity-60'
              }`}
              style={{ 
                background: filter === f.key ? 'var(--gold)' : 'var(--card)', 
                color: filter === f.key ? '#000000' : 'var(--text-sec)',
                border: filter === f.key ? 'none' : '1px solid var(--border)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {grouped.length === 0 ? (
          <div className="py-20 opacity-50">
            <EmptyState 
              icon="📊" 
              title={t('tx_empty_title')} 
              subtitle={t('tx_empty_subtitle')} 
              action={{ label: t('tx_add_new'), onClick: () => setShowAdd(true) }} 
            />
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([dateKey, txs]) => (
              <div key={dateKey} className="animate-slideUp">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
                  <span className="text-[11px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-sec)' }}>{fmtDateKhmer(dateKey)}</span>
                </div>
                <div className="space-y-2">
                  {txs.map((tx) => (
                    <div key={tx.id} className="relative group">
                      <ListItem
                        title={tx.note || tx.description || tx.category_name || t('tx_default_title')}
                        subtitle={(tx.account_name || '') + (tx.receipt_url ? ' 📎' : '') + ((tx as any).is_personal ? ' 🏠' : '')}
                        icon={tx.type === 'income' ? '↗️' : '↘️'}
                        iconBg={tx.type === 'income' ? 'var(--green-soft)' : 'var(--red-soft)'}
                        right={(tx.type === 'income' ? '+' : '-') + fmt(tx.amount_cents)}
                        rightColor={tx.type === 'income' ? 'var(--green)' : 'var(--red)'}
                        onPress={() => { haptic('light'); setSelectedTx(tx) }}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); haptic('medium'); setSelectedTx(tx) }}
                          className="w-8 h-8 flex items-center justify-center rounded-xl"
                          style={{ background: 'var(--border)' }}
                        >
                          <Icon name="chevron" size={14} color="var(--text-dim)" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed fab-bottom right-6 z-40">
        {!periodLocks[month] ? (
          <button
            onClick={() => { haptic('medium'); setShowAdd(true) }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-gold transition-all active:scale-95 group"
            style={{ background: 'var(--gold)' }}
          >
            <Icon name="plus" size={28} color="#000000" />
          </button>
        ) : (
          <button
            onClick={() => toast.error(t('period_locked_error', { period: month }))}
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'var(--border)', opacity: 0.5 }}
            disabled
          >
            <Icon name="lock" size={20} color="var(--text-dim)" />
          </button>
        )}
      </div>

      <AddTransactionSheet
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        periodLocks={periodLocks}
        onSaved={() => refetch()}
      />

      {/* Transaction Detail Sheet */}
      <BottomSheet isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} title={t('tx_detail_title')}>
        {selectedTx && (
          <div className="space-y-4">
            {/* Amount hero */}
            <div className="rounded-2xl p-5 flex flex-col items-center" style={{ background: selectedTx.type === 'income' ? 'var(--green-soft)' : 'var(--red-soft)' }}>
              <div className="text-[11px] font-bold mb-1 opacity-60" style={{ color: selectedTx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {selectedTx.type === 'income' ? t('tx_filter_income') : t('tx_filter_expense')}
              </div>
              <div className="text-3xl font-extrabold font-mono-num" style={{ color: selectedTx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {(selectedTx.type === 'income' ? '+' : '-')}{fmt(selectedTx.amount_cents)}
              </div>
            </div>

            {/* Detail rows */}
            <div className="rounded-2xl divide-y" style={{ background: 'var(--card)', border: '1px solid var(--border)', divideColor: 'var(--border)' }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-base">📁</span>
                <span className="text-xs font-semibold flex-1" style={{ color: 'var(--text-dim)' }}>{t('tx_form_category')}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{selectedTx.category_name || t('tx_detail_no_category')}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-base">🏦</span>
                <span className="text-xs font-semibold flex-1" style={{ color: 'var(--text-dim)' }}>{t('tx_form_account')}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{selectedTx.account_name || t('tx_detail_no_account')}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-base">📅</span>
                <span className="text-xs font-semibold flex-1" style={{ color: 'var(--text-dim)' }}>{t('tx_form_date')}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{fmtDateKhmer(selectedTx.occurred_at?.substring(0, 10))}</span>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="text-base">📝</span>
                <span className="text-xs font-semibold flex-1" style={{ color: 'var(--text-dim)' }}>{t('tx_form_note')}</span>
                <span className="text-sm font-bold text-right max-w-[55%]" style={{ color: (selectedTx.note || selectedTx.description) ? 'var(--text)' : 'var(--text-dim)' }}>
                  {selectedTx.note || selectedTx.description || t('tx_detail_no_note')}
                </span>
              </div>
            </div>

            {/* Receipt image */}
            {selectedTx.receipt_url && (
              <div>
                <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-sec)' }}>📎 {t('tx_receipt_label')}</div>
                <a href={selectedTx.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <img src={selectedTx.receipt_url} alt="Receipt" className="w-full max-h-64 object-cover" />
                    <div className="absolute bottom-0 inset-x-0 py-2 text-center text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                      {t('tx_receipt_tap')} ↗
                    </div>
                  </div>
                </a>
              </div>
            )}

            {/* Delete */}
            {periodLocks[selectedTx.occurred_at?.substring(0, 7)] ? (
              <div className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>
                <Icon name="lock" size={14} color="var(--text-dim)" /> {t('period_lock_title')}
              </div>
            ) : deleteId === selectedTx.id ? (
              <div className="flex gap-2">
                <button onClick={async () => { await handleDelete(); setSelectedTx(null) }} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: 'var(--red)' }}>{t('tx_delete_confirm')}</button>
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>{t('tx_delete_cancel')}</button>
              </div>
            ) : (
              <button onClick={() => { haptic('medium'); setDeleteId(selectedTx.id) }} className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
                <Icon name="trash" size={14} color="var(--red)" /> {t('tx_delete_confirm')}
              </button>
            )}
          </div>
        )}
      </BottomSheet>

    </div>
  )
}
