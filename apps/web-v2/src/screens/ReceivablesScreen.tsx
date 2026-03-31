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

const SORTS = [{ key: 'all', label: 'ទាំងអស់' }, { key: 'overdue', label: 'ហួសកំណត់' }, { key: 'active', label: 'សកម្ម' }]

export default function ReceivablesScreen({ onBack }: { onBack: () => void }) {
  const [sort, setSort] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const t = useI18nStore(s => s.t)
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
    await create({ contact_name: name, amount_cents: amt, due_date: due, description: desc || undefined })
    toast.success('បន្ថែមអ្នកជំពាក់ដោយជោគជ័យ')
    setShowAdd(false); setName(''); setAmt(0); setDesc('')
  }

  const handleCollect = async (id: string) => {
    haptic('success')
    await collect(id)
    toast.success('ប្រគល់ដោយជោគជ័យ')
  }

  const handleDelete = async () => {
    if (!deleteId) return
    haptic('error')
    await remove(deleteId)
    toast.success('លុបដោយជោគជ័យ')
    setDeleteId(null)
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
            <div className="text-xl font-extrabold font-mono-num mt-1" style={{ color: 'var(--red)' }}>{overdueCount} នាក់</div>
          </div>
        </div>
        <div className="flex gap-2">{SORTS.map(s => <Pill key={s.key} label={s.label} active={sort === s.key} onClick={() => setSort(s.key)} />)}</div>
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
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>កាលកំណត់: {r.due_date}</div>
                </div>
                <div className="text-sm font-bold font-mono-num shrink-0" style={{ color: 'var(--gold)' }}>{fmtKHR(r.amount_cents)}</div>
              </div>
              <div className="flex gap-2 mt-3">
                {days < 0 && (
                  <button onClick={() => handleRemind(r)} className="flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
                    <Icon name="telegram" size={12} /> រំលឹក
                  </button>
                )}
                <button onClick={() => handleCollect(r.id)} className="flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                  <Icon name="check" size={12} /> ប្រគល់
                </button>
                {deleteId === r.id ? (
                  <div className="flex gap-1">
                    <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: 'var(--red)' }}>លុប</button>
                    <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>បោះបង់</button>
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
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90" style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(232,184,75,0.3)' }}>
          <Icon name="plus" size={22} color="var(--bg)" />
        </button>
      </div>
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="អ្នកជំពាក់ថ្មី">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ឈ្មោះអ្នកជំពាក់</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ឈ្មោះ" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ចំនួនទឹកប្រាក់</label><CurrencyInput value={amt} onChange={setAmt} autoFocus /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>កាលកំណត់</label><input type="date" value={due} onChange={e => setDue(e.target.value)} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>កំណត់ចំណាំ</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="ចំណាំ" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>រក្សាទុក</button>
        </div>
      </BottomSheet>
    </div>
  )
}
