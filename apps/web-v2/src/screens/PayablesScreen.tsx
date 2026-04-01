import { useState } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import Icon from '../components/Icon'
import BottomSheet from '../components/BottomSheet'
import CurrencyInput from '../components/CurrencyInput'
import { usePayables } from '../hooks/usePayables'
import { useAmount } from '../hooks/useAmount'
import { fmtKHR, fmtDateKhmer, daysUntilDue } from '../lib/format'
import { useI18nStore } from '../store/i18nStore'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'

export default function PayablesScreen({ onBack }: { onBack: () => void }) {
  const { isLoading, active, totalPayable, create, remove } = usePayables()
  const { fmt } = useAmount()
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const t = useI18nStore(s => s.t)
  const lang = useI18nStore(s => s.lang)
  const [name, setName] = useState('')
  const [amt, setAmt] = useState(0)
  const [due, setDue] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const [desc, setDesc] = useState('')

  const handleSave = async () => {
    if (!name || amt <= 0) return
    haptic('success')
    try {
      await create({ contact_name: name, amount_cents: amt, due_date: due, description: desc || undefined })
      toast.success(t('tx_saved_success'))
      setShowAdd(false); setName(''); setAmt(0); setDesc('')
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

  if (isLoading) return (
    <div className="min-h-[100dvh] animate-fadeIn relative">
      <ScreenHeader title={t('payables')} onBack={onBack} />
      <div className="px-4 pt-3"><SkeletonLoader rows={5} /></div>
    </div>
  )

  return (
    <div className="min-h-[100dvh] animate-fadeIn relative">
      <ScreenHeader title={t('payables')} onBack={onBack} />
      <div className="px-4 space-y-4">
        <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--red) 0%, #C0392B 100%)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('payables_total')}</div>
          <div className="text-3xl font-black font-mono-num text-white">{fmt(totalPayable)}</div>
        </div>
        {active.length === 0 ? (
          <EmptyState icon="🏁" title={t('payables_empty_title')} subtitle={t('payables_empty_subtitle')} action={{ label: t('tx_add_new'), onClick: () => setShowAdd(true) }} />
        ) : active.map((r: any) => {
          const days = daysUntilDue(r.due_date)
          return (
            <div key={r.id} className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--orange-soft)' }}>
                  <Icon name="payable" size={16} color="var(--orange)" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{r.contact_name}</div>
                  <div className="text-[10px]" style={{ color: days < 0 ? 'var(--red)' : 'var(--text-dim)' }}>
                    {days < 0
                      ? t('days_overdue', { days: Math.abs(days) })
                      : `${t('tx_form_date')}: ${fmtDateKhmer(r.due_date)}`}
                  </div>
                </div>
                <div className="text-sm font-bold font-mono-num" style={{ color: 'var(--orange)' }}>{fmt(r.amount_cents)}</div>
                {deleteId === r.id ? (
                  <div className="flex gap-1">
                    <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: 'var(--red)' }}>{t('tx_delete_confirm')}</button>
                    <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>{t('tx_delete_cancel')}</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteId(r.id)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: 'var(--red-soft)' }}>
                    <Icon name="trash" size={12} color="var(--red)" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="fixed fab-bottom left-1/2 -translate-x-1/2 z-40">
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90" style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(232,184,75,0.3)' }}>
          <Icon name="plus" size={22} color="var(--bg)" />
        </button>
      </div>
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title={t('payables_add_title')}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('form_contact_name')}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t('form_contact_placeholder')} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_amount')}</label><CurrencyInput value={amt} onChange={setAmt} autoFocus /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('form_due_date')}</label><input type="date" value={due} onChange={e => setDue(e.target.value)} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>{t('tx_form_save')}</button>
        </div>
      </BottomSheet>
    </div>
  )
}
