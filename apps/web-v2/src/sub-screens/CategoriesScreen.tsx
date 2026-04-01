import { useState } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Pill from '../components/Pill'
import Badge from '../components/Badge'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import { useCategories } from '../hooks/useCategories'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'
import { useI18nStore } from '../store/i18nStore'

const EMOJIS = ['💰', '📦', '🍔', '🚗', '🏠', '📱', '💻', '👗', '💊', '🎮', '📚', '✈️', '🎵', '🏥', '🔧', '🎨', '☕', '🎯', '📊', '🏆', '🎁', '🖼️', '🍕', '⛽', '📧', '🏢', '🎓', '🌸', '🐾', '🧪']

export default function CategoriesScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState('expense')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📦')

  const { isLoading, incomeCategories, expenseCategories, create, remove } = useCategories()
  const t = useI18nStore(s => s.t)

  const categories = tab === 'income' ? incomeCategories : expenseCategories

  const handleSave = async () => {
    if (!name) return
    haptic('success')
    try {
      await create({ name, type: tab, icon: emoji })
      toast.success(t('tx_saved_success'))
      setShowAdd(false); setName(''); setEmoji('📦')
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

  if (isLoading) return <div className="min-h-[100dvh] animate-fadeIn relative"><ScreenHeader title={t('categories_title')} onBack={onBack} /><div className="px-4 pt-3"><SkeletonLoader rows={5} /></div></div>

  return (
    <div className="min-h-[100dvh] animate-fadeIn relative">
      <ScreenHeader title={t('categories_title')} onBack={onBack} />
      <div className="px-4 space-y-3">
        <div className="flex gap-2">
          <Pill label={t('expense')} active={tab === 'expense'} onClick={() => setTab('expense')} />
          <Pill label={t('income')} active={tab === 'income'} onClick={() => setTab('income')} />
        </div>
        {categories.length === 0 ? (
          <EmptyState icon="🏷️" title={t('categories_empty_title')} action={{ label: t('tx_add_new'), onClick: () => setShowAdd(true) }} />
        ) : categories.map(cat => (
          <div key={cat.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <span className="text-xl shrink-0">{cat.icon || '📦'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{cat.name}</div>
            </div>
            {cat.is_system && <Badge variant="muted">{t('settings_security')}</Badge>}
            {!cat.is_system && (deleteId === cat.id ? (
              <div className="flex gap-1">
                <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: 'var(--red)' }}>{t('tx_delete_confirm')}</button>
                <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>{t('tx_delete_cancel')}</button>
              </div>
            ) : (
              <button onClick={() => setDeleteId(cat.id)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: 'var(--red-soft)' }}>
                <Icon name="trash" size={12} color="var(--red)" />
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="fixed fab-bottom left-1/2 -translate-x-1/2 z-40">
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90" style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(232,184,75,0.3)' }}>
          <Icon name="plus" size={22} color="var(--bg)" />
        </button>
      </div>
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title={t('tx_add_new')}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('categories_form_name')}</label>
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
          <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>{t('tx_form_save')}</button>
        </div>
      </BottomSheet>
    </div>
  )
}
