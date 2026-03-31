import Icon from './Icon'
import { useState } from 'react'
export default function CompanySwitcher({ name }: { name?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl active:opacity-70" style={{ background: 'var(--gold-soft)' }}>
      <Icon name="building" size={16} color="var(--gold)" />
      <span className="text-sm font-bold truncate max-w-[140px]" style={{ color: 'var(--gold)' }}>{name || 'ក្រុមហ៊ុនរបស់ខ្ញុំ'}</span>
      <Icon name="chevronDown" size={12} color="var(--gold)" />
    </button>
  )
}
