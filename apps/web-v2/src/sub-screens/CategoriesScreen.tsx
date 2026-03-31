import { useState } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Pill from '../components/Pill'
import Badge from '../components/Badge'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import { useCategories } from '../hooks/useCategories'
import { useToastStore } from '../store/toastStore'
import { haptic } from '../lib/telegram'

const EMOJIS = ['💰','📦','🍔','🚗','🏠','📱','💻','👗','💊','🎮','📚','✈️','🎵','🏥','🔧','🎨','☕','🎯','📊','🏆','🎁','🖼️','🍕','⛽','📧','🏢','🎓','🌸','🐾','🧪']

export default function CategoriesScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState('expense')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📦')

  const { isLoading, incomeCategories, expenseCategories, create, remove } = useCategories()
  const addToast = useToastStore(s => s.addToast)

  const categories = tab === 'income' ? incomeCategories : expenseCategories

  const handleSave = async () => {
    if (!name) return
    haptic('success')
    await create({ name, type: tab, icon: emoji })
    addToast('success', 'បន្ថែមប្រភេទដោយជោគជ័យ')
    setShowAdd(false); setName(''); setEmoji('📦')
  }

  const handleDelete = async () => {
    if (!deleteId) return
    haptic('error')
    await remove(deleteId)
    addToast('success', 'លុបដោយជោគជ័យ')
    setDeleteId(null)
  }

  if (isLoading) return <div className="min-h-screen animate-fadeIn"><ScreenHeader title="ប្រភេទ" onBack={onBack} /><div className="px-4 pt-3"><SkeletonLoader rows={5} /></div></div>

  return (
    <div className="min-h-screen animate-fadeIn">
      <ScreenHeader title="ប្រភេទចំណូលចំណាយ" onBack={onBack} />
      <div className="px-4 space-y-3">
        <div className="flex gap-2">
          <Pill label="ចំណាយ" active={tab === 'expense'} onClick={() => setTab('expense')} />
          <Pill label="ចំណូល" active={tab === 'income'} onClick={() => setTab('income')} />
        </div>
        {categories.length === 0 ? (
          <EmptyState icon="🏷️" title="មិនទាន់មានប្រភេទ" action={{ label: '+ ថ្មី', onClick: () => setShowAdd(true) }} />
        ) : categories.map(cat => (
          <div key={cat.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <span className="text-xl shrink-0">{cat.icon || '📦'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{cat.name}</div>
            </div>
            {cat.is_system && <Badge variant="muted">ប្រព័ន្ធ</Badge>}
            {!cat.is_system && (deleteId === cat.id ? (
              <div className="flex gap-1">
                <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: 'var(--red)' }}>លុប</button>
                <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>បោះបង់</button>
              </div>
            ) : (
              <button onClick={() => setDeleteId(cat.id)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: 'var(--red-soft)' }}>
                <Icon name="trash" size={12} color="var(--red)" />
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90" style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(232,184,75,0.3)' }}>
          <Icon name="plus" size={22} color="var(--bg)" />
        </button>
      </div>
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="ប្រភេទថ្មី">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ឈ្មោះប្រភេទ</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ឧ. អាហារពេលព្រឹក" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>រូបសញ្ញា</label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-auto p-2 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} className="w-9 h-9 rounded-lg flex items-center justify-center text-lg active:scale-90" style={{ background: emoji === e ? 'var(--gold-soft)' : 'transparent', border: emoji === e ? '1px solid var(--gold)' : '1px solid transparent' }}>{e}</button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>រក្សាទុក</button>
        </div>
      </BottomSheet>
    </div>
  )
}
