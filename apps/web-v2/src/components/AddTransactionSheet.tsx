import { useState, useRef, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import CurrencyInput from './CurrencyInput'
import Icon from './Icon'
import { useCategories } from '../hooks/useCategories'
import { useAccounts } from '../hooks/useAccounts'
import { useAmount } from '../hooks/useAmount'
import { useReceiptUpload } from '../hooks/useReceiptUpload'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../store/i18nStore'
import { api, ApiError } from '../lib/api'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'

interface Props {
  isOpen: boolean
  onClose: () => void
  defaultType?: 'income' | 'expense'
  onSaved?: () => void
  periodLocks?: Record<string, { locked_by: string; locked_at: string }>
}

export default function AddTransactionSheet({
  isOpen,
  onClose,
  defaultType = 'income',
  onSaved,
  periodLocks = {},
}: Props) {
  const t = useI18nStore(s => s.t)
  const { companyId } = useAuthStore()
  const { currency } = useAmount()
  const [type, setType] = useState<'income' | 'expense'>(defaultType)
  const [amount, setAmount] = useState(0)
  const [txCurrency, setTxCurrency] = useState<'USD' | 'KHR'>(currency as 'USD' | 'KHR')
  const [isPersonal, setIsPersonal] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [desc, setDesc] = useState('')
  const [quickMode, setQuickMode] = useState(true)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { incomeCategories, expenseCategories } = useCategories()
  const { accounts } = useAccounts()
  const { uploadReceipt, uploading, progress } = useReceiptUpload()

  const filteredCategories = type === 'income' ? incomeCategories : expenseCategories

  // Reset form each time the sheet opens
  useEffect(() => {
    if (isOpen) {
      setType(defaultType)
      setAmount(0)
      setIsPersonal(false)
      setCategoryId('')
      setAccountId('')
      setDate(new Date().toISOString().slice(0, 10))
      setDesc('')
      setReceiptUrl(null)
      setReceiptPreview(null)
      setQuickMode(true)
      setTxCurrency(currency as 'USD' | 'KHR')
    }
  }, [isOpen, defaultType]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptPreview(URL.createObjectURL(file))
    try {
      const url = await uploadReceipt(file)
      setReceiptUrl(url)
      toast.success('Receipt uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
      setReceiptPreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    if (amount <= 0) {
      toast.error(t('tx_form_amount') + ' > 0')
      return
    }
    const txMonth = date.substring(0, 7)
    if (periodLocks[txMonth]) {
      toast.error(t('period_locked_error', { period: txMonth }))
      return
    }
    haptic('success')
    try {
      await api.post(`/${companyId}/transactions`, {
        type,
        amount_cents: amount,
        currency_input: txCurrency,
        is_personal: isPersonal,
        category_id: categoryId || undefined,
        account_id: accountId || undefined,
        occurred_at: new Date(date).toISOString(),
        note: desc || undefined,
        receipt_url: receiptUrl || undefined,
      })
      toast.success(t('tx_saved_success'))
      onClose()
      onSaved?.()
    } catch (e: any) {
      console.error(e)
      if (e instanceof ApiError && e.code === 'PeriodLocked') {
        toast.error(t('period_locked_error', { period: txMonth }))
      } else {
        toast.error(e.message || 'Failed to save transaction')
      }
    }
  }

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title={type === 'income' ? 'ចំណូលថ្មី' : 'ចំណាយថ្មី'}>
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

          {/* Currency toggle (per-transaction) */}
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--border)' }}>
            {(['USD', 'KHR'] as const).map(c => (
              <button
                key={c}
                onClick={() => { haptic('light'); setTxCurrency(c); setAmount(0) }}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: txCurrency === c ? 'var(--card)' : 'transparent',
                  color: txCurrency === c ? 'var(--gold)' : 'var(--text-dim)',
                }}
              >
                {c === 'USD' ? '$ USD' : '៛ KHR'}
              </button>
            ))}
          </div>

          {/* Business / Personal toggle */}
          <button
            onClick={() => { haptic('light'); setIsPersonal(p => !p) }}
            className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: isPersonal ? 'var(--border)' : 'var(--gold-soft)',
              color: isPersonal ? 'var(--text-dim)' : 'var(--gold)',
              border: `1px solid ${isPersonal ? 'var(--border)' : 'var(--gold-med)'}`,
            }}
          >
            <span>{isPersonal ? '🏠' : '💼'}</span>
            <span>{isPersonal ? t('tx_personal') : t('tx_business')}</span>
          </button>

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
            <CurrencyInput value={amount} onChange={setAmount} autoFocus currency={txCurrency} />
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

          <button onClick={handleSave} disabled={uploading} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98] disabled:opacity-60" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>
            {uploading ? `${progress}%…` : t('tx_form_save')}
          </button>
        </div>
      </BottomSheet>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFilePick}
      />
    </>
  )
}
