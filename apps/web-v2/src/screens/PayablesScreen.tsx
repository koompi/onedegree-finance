import { useState } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import Icon from '../components/Icon'
import BottomSheet from '../components/BottomSheet'
import CurrencyInput from '../components/CurrencyInput'
import { usePayables } from '../hooks/usePayables'
import { fmtKHR, daysUntilDue } from '../lib/format'
import { useToastStore } from '../store/toastStore'
import { haptic } from '../lib/telegram'

export default function PayablesScreen({ onBack }: { onBack: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [amt, setAmt] = useState(0)
  const [due, setDue] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const [desc, setDesc] = useState('')

  const { isLoading, active, totalPayable, create, remove } = usePayables()
  const addToast = useToastStore(s => s.addToast)

  const handleSave = async () => {
    if (!name || amt <= 0) return
    haptic('success')
    await create({ contact_name: name, amount: amt, due_date: due, description: desc || undefined })
    addToast('success', 'បន្ថែមបំណុលដោយជោគជ័យ')
    setShowAdd(false); setName(''); setAmt(0); setDesc('')
  }

  const handleDelete = async () => {
    if (!deleteId) return
    haptic('error')
    await remove(deleteId)
    addToast('success', 'លុបដោយជោគជ័យ')
    setDeleteId(null)
  }

  if (isLoading) return <div className="min-h-screen animate-fadeIn"><ScreenHeader title="យើងជំពាក់គេ" onBack={onBack} /><div className="px-4 pt-3"><SkeletonLoader rows={3} /></div></div>

  return (
    <div className="min-h-screen animate-fadeIn">
      <ScreenHeader title="យើងជំពាក់គេ" onBack={onBack} />
      <div className="px-4 space-y-3">
        <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-dim)' }}>សរុបត្រូវបង់</div>
          <div className="text-xl font-extrabold font-mono-num mt-1" style={{ color: 'var(--orange)' }}>{fmtKHR(totalPayable)}</div>
        </div>
        {active.length === 0 ? (
          <EmptyState icon="💰" title="មិនទាន់មានបំណុល" action={{ label: '+ ថ្មី', onClick: () => setShowAdd(true) }} />
        ) : active.map(r => {
          const days = daysUntilDue(r.due_date)
          return (
            <div key={r.id} className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--orange-soft)' }}>
                  <Icon name="payable" size={16} color="var(--orange)" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{r.contact_name}</div>
                  <div className="text-[10px]" style={{ color: days < 0 ? 'var(--red)' : 'var(--text-dim)' }}>{days < 0 ? `ហួស ${Math.abs(days)} ថ្ងៃ` : `កាលកំណត់: ${r.due_date}`}</div>
                </div>
                <div className="text-sm font-bold font-mono-num" style={{ color: 'var(--orange)' }}>{fmtKHR(r.amount)}</div>
                {deleteId === r.id ? (
                  <div className="flex gap-1">
                    <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: 'var(--red)' }}>លុប</button>
                    <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>បោះបង់</button>
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
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90" style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(232,184,75,0.3)' }}>
          <Icon name="plus" size={22} color="var(--bg)" />
        </button>
      </div>
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="បំណុលថ្មី">
        <div className="space-y-4">
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ឈ្មោះម្ចាស់បំណុល</label><input value={name} onChange={e => setName(e.target.value)} placeholder="ឈ្មោះ" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ចំនួនទឹកប្រាក់</label><CurrencyInput value={amt} onChange={setAmt} autoFocus /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>កាលកំណត់</label><input type="date" value={due} onChange={e => setDue(e.target.value)} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>រក្សាទុក</button>
        </div>
      </BottomSheet>
    </div>
  )
}
