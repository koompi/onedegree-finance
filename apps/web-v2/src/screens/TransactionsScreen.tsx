import { useState, useMemo, useRef } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Pill from '../components/Pill'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import CurrencyInput from '../components/CurrencyInput'
import ListItem from '../components/ListItem'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useAccounts } from '../hooks/useAccounts'
import { useAmount } from '../hooks/useAmount'
import { useReceiptUpload } from '../hooks/useReceiptUpload'
import { fmtDateKhmer } from '../lib/format'
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
  const [selectedTx, setSelectedTx] = useState<import('../hooks/useTransactions').Transaction | null>(null)
  const [quickMode, setQuickMode] = useState(true)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { isLoading, transactions, create, remove } = useTransactions(month, filter)
  const { categories, incomeCategories, expenseCategories } = useCategories()
  const { accounts } = useAccounts()
  const { fmt } = useAmount()
  const { uploadReceipt, uploading, progress } = useReceiptUpload()


  const filteredCategories = type === 'income' ? incomeCategories : expenseCategories

  const grouped = useMemo(() => {
    let txs = transactions
    if (search) txs = txs.filter(t => (t.category_name || t.description || '').toLowerCase().includes(search.toLowerCase()))
    const groups: Record<string, typeof txs> = {}
    txs.forEach(t => { const d = t.occurred_at?.substring(0, 10) || ''; (groups[d] = groups[d] || []).push(t) })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [transactions, search])

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Show local preview immediately
    setReceiptPreview(URL.createObjectURL(file))
    try {
      const url = await uploadReceipt(file)
      setReceiptUrl(url)
      toast.success('Receipt uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
      setReceiptPreview(null)
    }
    // Reset file input so same file can be re-picked
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    if (amount <= 0) {
      toast.error(t('tx_form_amount') + ' > 0')
      return
    }
    haptic('success')
    try {
      await create({
        type,
        amount_cents: amount,
        currency_input: 'KHR',
        category_id: categoryId || undefined,
        account_id: accountId || undefined,
        occurred_at: new Date(date).toISOString(),
        note: desc || undefined,
        receipt_url: receiptUrl || undefined,
      } as any)
      toast.success(t('tx_saved_success'))
      setShowAdd(false)
      setAmount(0); setDesc(''); setCategoryId(''); setAccountId('')
      setReceiptUrl(null); setReceiptPreview(null)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Failed to save transaction')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    haptic('error')
    await remove(deleteId)
    toast.success(t('tx_deleted_success'))
    setDeleteId(null)
  }

  if (isLoading) return (
    <div className="min-h-[100dvh] animate-fadeIn">
      <ScreenHeader title={t('nav_transactions')} onBack={onBack} />
      <div className="px-4 pt-3"><SkeletonLoader rows={6} /></div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col animate-fadeIn overflow-hidden">
      <ScreenHeader title={t('nav_transactions')} onBack={onBack}
        right={<button onClick={() => { haptic('light'); setSearchOpen(!searchOpen) }} className="w-10 h-10 flex items-center justify-center rounded-2xl active:bg-white/5 transition-all"><Icon name="search" size={20} color="var(--text-sec)" /></button>} />
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-40 px-4 space-y-4 pt-2">
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
                        title={tx.description || tx.category_name || t('tx_default_title')}
                        subtitle={(tx.account_name || '') + (tx.receipt_url ? ' 📎' : '')}
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
        <button 
          onClick={() => { haptic('medium'); setShowAdd(true) }} 
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-gold transition-all active:scale-95 group"
          style={{ background: 'var(--gold)' }}
        >
          <Icon name="plus" size={28} color="#000000" />
        </button>
      </div>

      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title={type === 'income' ? 'ចំណូលថ្មី' : 'ចំណាយថ្មី'}>
        <div className="space-y-4">
          {/* Income / Expense type toggle */}
          <div className="flex gap-2">
            {(['income', 'expense'] as const).map(t_alias => (
              <button key={t_alias} onClick={() => setType(t_alias)} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: type === t_alias ? 'var(--gold)' : 'var(--border)', color: type === t_alias ? 'var(--bg)' : 'var(--text-sec)' }}>
                {t_alias === 'income' ? t('tx_filter_income') : t('tx_filter_expense')}
              </button>
            ))}
          </div>

          {/* Quick / Detail mode toggle */}
          <div className="flex items-center gap-2 p-1 rounded-xl" style={{ background: 'var(--border)' }}>
            <button
              onClick={() => { haptic('light'); setQuickMode(true) }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: quickMode ? 'var(--card)' : 'transparent', color: quickMode ? 'var(--gold)' : 'var(--text-dim)' }}
            >⚡ រហ័ស</button>
            <button
              onClick={() => { haptic('light'); setQuickMode(false) }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: !quickMode ? 'var(--card)' : 'transparent', color: !quickMode ? 'var(--gold)' : 'var(--text-dim)' }}
            >📋 លម្អិត</button>
          </div>

          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_amount')}</label>
            <CurrencyInput value={amount} onChange={setAmount} autoFocus />
          </div>

          {!quickMode && (
            <>
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

              {/* Receipt photo */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>📎 វិក្កយបត្រ / Receipt</label>
                {receiptPreview ? (
                  <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <img src={receiptPreview} alt="Receipt" className="w-full max-h-40 object-cover" />
                    {uploading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                        <div className="text-white text-xs font-bold">{progress}%</div>
                        <div className="w-24 h-1 rounded-full mt-1" style={{ background: 'rgba(255,255,255,0.3)' }}>
                          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'var(--gold)' }} />
                        </div>
                      </div>
                    )}
                    {!uploading && (
                      <button
                        onClick={() => { setReceiptUrl(null); setReceiptPreview(null) }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.6)' }}
                      >
                        <Icon name="close" size={12} color="white" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98]"
                    style={{ background: 'var(--input-bg)', border: '1px dashed var(--border)', color: 'var(--text-sec)' }}
                  >
                    <span>📷 ថតរូប / ជ្រើសរូប</span>
                  </button>
                )}
              </div>
            </>
          )}

          <button onClick={handleSave} disabled={uploading} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98] disabled:opacity-60" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>{uploading ? `${progress}%…` : t('tx_form_save')}</button>
        </div>
      </BottomSheet>

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
                <span className="text-sm font-bold text-right max-w-[55%]" style={{ color: selectedTx.description ? 'var(--text)' : 'var(--text-dim)' }}>
                  {selectedTx.description || t('tx_detail_no_note')}
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
            {deleteId === selectedTx.id ? (
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

      {/* Hidden file input for receipt photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFilePick}
      />
    </div>
  )
}
