import { useState } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import CurrencyInput from '../components/CurrencyInput'
import { useAccounts } from '../hooks/useAccounts'
import { useAmount } from '../hooks/useAmount'
import { fmtKHR } from '../lib/format'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'
import { useI18nStore } from '../store/i18nStore'

export default function AccountsScreen({ onBack }: { onBack: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('cash')
  const [number, setNumber] = useState('')
  const [initialBalance, setInitialBalance] = useState(0)
  const t = useI18nStore(s => s.t)
  const { isLoading, accounts, totalBalance, create, update, remove } = useAccounts()
  const { fmt } = useAmount()

  const handleSave = async () => {
    if (!name) return
    haptic('success')
    try {
      await create({ name, type, account_number: number || undefined })
      toast.success(t('tx_saved_success'))
      setShowAdd(false); setName(''); setType('cash'); setNumber('')
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    haptic('error')
    try {
      await remove(deleteId)
      toast.success(t('tx_deleted_success'))
      setDeleteId(null)
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  if (isLoading) return <div className="min-h-[100dvh] animate-fadeIn relative"><ScreenHeader title={t('accounts_title')} onBack={onBack} /><div className="px-4 pt-3"><SkeletonLoader rows={4} /></div></div>

  const TYPE_ICONS: Record<string, string> = { cash: 'wallet', bank: 'building', mobile: 'phone', other: 'tag' }
  const TYPE_LABELS: Record<string, string> = {
    cash: t('accounts_type_cash'),
    bank: t('accounts_type_bank'),
    mobile: t('accounts_type_mobile'),
    other: t('accounts_type_other')
  }

  return (
    <div className="min-h-[100dvh] animate-fadeIn relative">
      <ScreenHeader title={t('accounts_title')} onBack={onBack} />
      <div className="px-4 space-y-3">
        <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-dim)' }}>{t('accounts_total_balance')}</div>
          <div className="text-xl font-extrabold font-mono-num mt-1" style={{ color: 'var(--text)' }}>{fmt(totalBalance)}</div>
        </div>
        {accounts.length === 0 ? (
          <EmptyState icon="🏦" title={t('accounts_empty_title')} action={{ label: t('tx_add_new'), onClick: () => setShowAdd(true) }} />
        ) : accounts.map(acc => (
          <div key={acc.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gold-soft)' }}>
              <Icon name={(TYPE_ICONS[acc.type || 'other'] || 'wallet') as any} size={16} color="var(--gold)" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{acc.name}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{TYPE_LABELS[acc.type || 'other'] || acc.type}{acc.account_number ? ` • ${acc.account_number}` : ''}</div>
            </div>
            <div className="text-sm font-bold font-mono-num" style={{ color: 'var(--text)' }}>{fmt(acc.balance || 0)}</div>
            {deleteId === acc.id ? (
              <div className="flex gap-1">
                <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: 'var(--red)' }}>{t('tx_delete_confirm')}</button>
                <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>{t('tx_delete_cancel')}</button>
              </div>
            ) : (
              <button onClick={() => setDeleteId(acc.id)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: 'var(--red-soft)' }}>
                <Icon name="trash" size={12} color="var(--red)" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="fixed fab-bottom left-1/2 -translate-x-1/2 z-40">
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90" style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(232,184,75,0.3)' }}>
          <Icon name="plus" size={22} color="var(--bg)" />
        </button>
      </div>
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title={t('accounts_form_name')}>
        <div className="space-y-4">
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('accounts_form_name')}</label><input value={name} onChange={e => setName(e.target.value)} placeholder={t('accounts_form_name_placeholder')} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('accounts_form_type')}</label>
            <div className="flex gap-2">
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setType(k)} className="flex-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: type === k ? 'var(--gold)' : 'var(--border)', color: type === k ? 'var(--bg)' : 'var(--text-sec)' }}>{v}</button>
              ))}
            </div>
          </div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('accounts_form_number')}</label><input value={number} onChange={e => setNumber(e.target.value)} placeholder={t('accounts_form_number_placeholder')} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>{t('tx_form_save')}</button>
        </div>
      </BottomSheet>
    </div>
  )
}
