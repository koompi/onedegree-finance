import { useState } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Pill from '../components/Pill'
import Badge from '../components/Badge'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import CurrencyInput from '../components/CurrencyInput'
import { useReceivables } from '../hooks/useReceivables'
import { fmtKHR, daysUntilDue, overdueBadgeText } from '../lib/format'
import { useI18nStore } from '../store/i18nStore'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'
import { getTelegram } from '../lib/telegram'

const SORTS = (t: any) => [{ key: 'all', label: t('sort_all') }, { key: 'overdue', label: t('sort_overdue') }, { key: 'active', label: t('sort_active') }]

export default function ReceivablesScreen({ onBack }: { onBack: () => void }) {
  const t = useI18nStore(s => s.t)
  const lang = useI18nStore(s => s.lang)
  const [sort, setSort] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [amt, setAmt] = useState(0)
  const [due, setDue] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const [desc, setDesc] = useState('')

  const { isLoading, active, totalOwed, overdueCount, create, remove, collect } = useReceivables()

  const filtered = sort === 'overdue' ? active.filter(r => daysUntilDue(r.due_date) < 0)
    : sort === 'active' ? active
      : active

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

  const handleCollect = async (id: string) => {
    haptic('success')
    try {
      await collect(id)
      toast.success(t('tx_saved_success'))
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

  const handleRemind = (r: any) => {
    const tg = getTelegram()
    if (tg?.openTelegramLink && r.phone) {
      tg.openTelegramLink(`https://t.me/${r.phone.replace('@', '')}`)
    } else {
      const text = `សួស្ដី ${r.contact_name}%0Aឯកជនអាជីវកម្ម ${r.contact_name} នៅតែជំពាក់ចំនួន ${fmtKHR(r.amount_cents)} ដែលត្រូវបង់មុនថ្ងៃ ${r.due_date}%0Aសូមទាក់ក្នុងពេលឆាប់ដើម្បីជៀសវាងការគិតថ្លៃបន្ថែម`
      tg?.openTelegramLink(`https://t.me/share/url?text=${text}`)
    }
  }

  if (isLoading) return <div className="min-h-screen animate-fadeIn relative"><ScreenHeader title={t('nav_receivables')} onBack={onBack} /><div className="px-4 pt-3"><SkeletonLoader rows={4} /></div></div>

  return (
    <div className="min-h-screen animate-fadeIn relative">
      <ScreenHeader title={t('nav_receivables')} onBack={onBack} />
      <div className="px-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-dim)' }}>{t('receivables_total')}</div>
            <div className="text-xl font-extrabold font-mono-num mt-1" style={{ color: 'var(--text)' }}>{fmtKHR(totalOwed)}</div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-dim)' }}>{t('receivables_overdue')}</div>
            <div className="text-xl font-extrabold font-mono-num mt-1" style={{ color: 'var(--red)' }}>{overdueCount} {lang === 'km' ? 'នាក់' : 'persons'}</div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {SORTS(t).map(s => (
            <Pill
              key={s.key}
              label={s.label}
              active={sort === s.key}
              onClick={() => { haptic('light'); setSort(s.key) }}
            />
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="💸" title={t('receivables_empty_title')} subtitle={t('receivables_empty_subtitle')} action={{ label: t('tx_add_new'), onClick: () => setShowAdd(true) }} />
        ) : filtered.map(r => {
          const days = daysUntilDue(r.due_date)
          return (
            <div key={r.id} className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: 'var(--gold-soft)' }}>
                  <Icon name="receivable" size={16} color="var(--gold)" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{r.contact_name}</span>
                    {days < 0 && <Badge variant="error">{overdueBadgeText(days)}</Badge>}
                    {days >= 0 && days <= 3 && <Badge variant="warning">{overdueBadgeText(days)}</Badge>}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{t('tx_form_date')}: {r.due_date}</div>
                </div>
                <div className="text-sm font-bold font-mono-num shrink-0" style={{ color: 'var(--gold)' }}>{fmtKHR(r.amount_cents)}</div>
              </div>
              <div className="flex gap-2 mt-3">
                {days < 0 && (
                  <button onClick={() => handleRemind(r)} className="flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
                    <Icon name="telegram" size={12} /> {t('action_remind')}
                  </button>
                )}
                <button onClick={() => handleCollect(r.id)} className="flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                  <Icon name="check" size={12} /> {t('action_collect')}
                </button>
                {deleteId === r.id ? (
                  <div className="flex gap-1">
                    <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: 'var(--red)' }}>{t('tx_delete_confirm')}</button>
                    <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>{t('tx_delete_cancel')}</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteId(r.id)} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'var(--red-soft)' }}>
                    <Icon name="trash" size={12} color="var(--red)" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-28 right-6 z-40">
        <button 
          onClick={() => { haptic('medium'); setShowAdd(true) }} 
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-gold transition-all active:scale-95 group"
          style={{ background: 'var(--gold)' }}
        >
          <Icon name="plus" size={28} color="#000000" />
        </button>
      </div>

      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title={t('receivables_add_title')}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('profile_form_name')}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t('profile_form_name')} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_amount')}</label><CurrencyInput value={amt} onChange={setAmt} autoFocus /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_date')}</label><input type="date" value={due} onChange={e => setDue(e.target.value)} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_note')}</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('tx_form_note_placeholder')} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>{t('tx_form_save')}</button>
        </div>
      </BottomSheet>
    </div>
  )
}
