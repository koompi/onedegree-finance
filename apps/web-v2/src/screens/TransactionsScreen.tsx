import { useState, useMemo } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Pill from '../components/Pill'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import CurrencyInput from '../components/CurrencyInput'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useAccounts } from '../hooks/useAccounts'
import { fmtKHR, fmtDateKhmer } from '../lib/format'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'
import { useI18nStore } from '../store/i18nStore'

export default function TransactionsScreen({ onBack }: { onBack: () => void }) {
  const t = useI18nStore(s => s.t)
  const FILTERS = [
    { key: 'all', label: t('tx_filter_all') },
    { key: 'income', label: t('tx_filter_income') },
    { key: 'expense', label: t('tx_filter_expense') },
  ]
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [amount, setAmount] = useState(0)
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [desc, setDesc] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { isLoading, transactions, create, remove } = useTransactions(month, filter)
  const { categories, incomeCategories, expenseCategories } = useCategories()
  const { accounts } = useAccounts()


  const filteredCategories = type === 'income' ? incomeCategories : expenseCategories

  const grouped = useMemo(() => {
    let txs = transactions
    if (search) txs = txs.filter(t => (t.category_name || t.description || '').toLowerCase().includes(search.toLowerCase()))
    const groups: Record<string, typeof txs> = {}
    txs.forEach(t => { const d = t.occurred_at?.substring(0, 10) || ''; (groups[d] = groups[d] || []).push(t) })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [transactions, search])

  const handleSave = async () => {
    if (amount <= 0) return
    haptic('success')
    await create({ type, amount_cents: amount, currency_input: 'KHR', category_id: categoryId || undefined, account_id: accountId || undefined, occurred_at: new Date(date).toISOString(), note: desc || undefined } as any)
    toast.success(t('tx_saved_success'))
    setShowAdd(false)
    setAmount(0); setDesc(''); setCategoryId(''); setAccountId('')
  }

  const handleDelete = async () => {
    if (!deleteId) return
    haptic('error')
    await remove(deleteId)
    toast.success(t('tx_deleted_success'))
    setDeleteId(null)
  }

  if (isLoading) return (
    <div className="min-h-screen animate-fadeIn">
      <ScreenHeader title={t('nav_transactions')} onBack={onBack} />
      <div className="px-4 pt-3"><SkeletonLoader rows={6} /></div>
    </div>
  )

  return (
    <div className="min-h-screen animate-fadeIn">
      <ScreenHeader title={t('nav_transactions')} onBack={onBack}
        right={<button onClick={() => setSearchOpen(!searchOpen)} className="w-8 h-8 flex items-center justify-center"><Icon name="search" size={18} color="var(--text-sec)" /></button>} />
      <div className="px-4 space-y-3">
        {searchOpen && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
            <Icon name="search" size={14} color="var(--text-dim)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('tx_search_placeholder')} className="flex-1 bg-transparent outline-none text-sm" style={{ color: 'var(--text)' }} />
          </div>
        )}
        <div className="flex gap-2">{FILTERS.map(f => <Pill key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />)}</div>
        {grouped.length === 0 ? (
          <EmptyState icon="📊" title={t('tx_empty_title')} subtitle={t('tx_empty_subtitle')} action={{ label: t('tx_add_new'), onClick: () => setShowAdd(true) }} />
        ) : grouped.map(([dateKey, txs]) => (
          <div key={dateKey}>
            <div className="text-[11px] font-bold px-1 mb-1" style={{ color: 'var(--text-dim)' }}>{fmtDateKhmer(dateKey)}</div>
            <div className="rounded-2xl px-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              {txs.map((tx, i) => (
                <div key={tx.id}>
                  <div className="flex items-center gap-3 py-3" style={i < txs.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{tx.category_name || tx.description || t('tx_default_title')}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{tx.account_name || ''}</div>
                    </div>
                    <div className="text-sm font-bold font-mono-num" style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                      {tx.type === 'income' ? '+' : '-'}{fmtKHR(tx.amount_cents)}
                    </div>
                    {deleteId === tx.id ? (
                      <div className="flex gap-1">
                        <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: 'var(--red)' }}>{t('tx_delete_confirm')}</button>
                        <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>{t('tx_delete_cancel')}</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(tx.id)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: 'var(--red-soft)' }}>
                        <Icon name="trash" size={12} color="var(--red)" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full sm:max-w-[400px] z-40 flex justify-center">
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90"
          style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(232,184,75,0.3)' }}>
          <Icon name="plus" size={22} color="var(--bg)" />
        </button>
      </div>

      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title={type === 'income' ? 'ចំណូលថ្មី' : 'ចំណាយថ្មី'}>
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['income', 'expense'] as const).map(t_alias => (
              <button key={t_alias} onClick={() => setType(t_alias)} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: type === t_alias ? 'var(--gold)' : 'var(--border)', color: type === t_alias ? 'var(--bg)' : 'var(--text-sec)' }}>
                {t_alias === 'income' ? t('tx_filter_income') : t('tx_filter_expense')}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_amount')}</label>
            <CurrencyInput value={amount} onChange={setAmount} autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_category')}</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <option value="">{t('tx_form_cat_placeholder')}</option>
              {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_account')}</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <option value="">{t('tx_form_acc_placeholder')}</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_date')}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_note')}</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('tx_form_note_placeholder')} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>{t('tx_form_save')}</button>
        </div>
      </BottomSheet>
    </div>
  )
}
