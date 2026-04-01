import Icon from './Icon'
import { useState } from 'react'
import { haptic } from '../lib/telegram'

export default function CompanySwitcher({ name }: { name?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => { haptic('light'); setOpen(!open) }} className="flex items-center gap-2 px-4 py-2 rounded-[16px] active:scale-95 transition-all shadow-sm group" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors group-active:bg-gold-soft" style={{ background: 'var(--gold-soft)' }}>
        <Icon name="building" size={14} color="var(--gold)" />
      </div>
      <span className="text-sm font-black truncate max-w-[160px] uppercase tracking-wide" style={{ color: 'var(--text)' }}>{name || 'ក្រុមហ៊ុនរបស់ខ្ញុំ'}</span>
      <Icon name="chevronDown" size={14} color="var(--text-dim)" />
    </button>
  )
}
