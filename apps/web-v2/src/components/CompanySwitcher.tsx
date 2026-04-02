import Icon from './Icon'
import { useState } from 'react'
import { haptic } from '../lib/telegram'
import BottomSheet from './BottomSheet'
import { useCompany } from '../hooks/useCompany'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../store/i18nStore'

export default function CompanySwitcher({ name }: { name?: string }) {
  const [open, setOpen] = useState(false)
  const { companies } = useCompany()
  const t = useI18nStore(s => s.t)
  const { companyId, setAuth, token, refreshToken } = useAuthStore()

  const handleSelect = (c: { id: string, name: string }) => {
    haptic('light')
    if (token) {
      setAuth(token, c.id, c.name, refreshToken || undefined)
    }
    setOpen(false)
  }

  return (
    <>
      <button onClick={() => { haptic('light'); setOpen(true) }} className="flex items-center gap-2 px-4 py-2 rounded-[16px] active:scale-95 transition-all shadow-sm group" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors group-active:bg-gold-soft" style={{ background: 'var(--gold-soft)' }}>
          <Icon name="building" size={14} color="var(--gold)" />
        </div>
        <span className="text-sm font-black truncate max-w-[160px] uppercase tracking-wide" style={{ color: 'var(--text)' }}>{name || 'ក្រុមហ៊ុនរបស់ខ្ញុំ'}</span>
        <Icon name="chevronDown" size={14} color="var(--text-dim)" />
      </button>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="ជ្រើសរើសក្រុមហ៊ុន">
        <div className="space-y-3">
          {companies.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className="w-full flex items-center justify-between p-4 rounded-2xl active:scale-[0.98] transition-transform"
              style={{
                background: c.id === companyId ? 'var(--gold)' : 'var(--bg)',
                border: '1px solid var(--border)',
                color: c.id === companyId ? '#000' : 'var(--text)'
              }}
            >
              <div className="flex items-center gap-3 space-x-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: c.id === companyId ? 'rgba(0,0,0,0.1)' : 'var(--card)' }}>
                  <Icon name="building" size={20} color={c.id === companyId ? '#000' : 'var(--text)'} />
                </div>
                <div className="text-left">
                     <div className="font-bold text-sm">{c.name}</div>
                     <div className="text-xs opacity-70">{c.type || 'Business'}</div>
                </div>
              </div>
              {c.id === companyId && <Icon name="check" size={20} color="#000" />}
            </button>
          ))}
          <div className="pt-4 px-2 text-center text-xs opacity-60">
            You can add new companies in Setting &gt; My Company
          </div>
        </div>
      </BottomSheet>
    </>
  )
}

