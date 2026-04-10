import Icon from './Icon'
import { useState } from 'react'
import { haptic } from '../lib/telegram'
import BottomSheet from './BottomSheet'
import { useCompany } from '../hooks/useCompany'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'
import { toast } from '../store/toastStore'

const TYPES = [
  { value: 'general', label: 'ទូទៅ', sub: 'General' },
  { value: 'retail', label: 'លក់រាយ', sub: 'Retail' },
  { value: 'service', label: 'សេវា', sub: 'Service' },
  { value: 'agro', label: 'កសិ', sub: 'Agro' },
  { value: 'other', label: 'ផ្សេង', sub: 'Other' },
]

export default function CompanySwitcher({ name }: { name?: string }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('general')
  const [newCurrency, setNewCurrency] = useState<'USD' | 'KHR'>('USD')
  const [saving, setSaving] = useState(false)
  const { companies, refetch } = useCompany()
  const { companyId, setAuth, token, refreshToken } = useAuthStore()

  const handleSelect = (c: { id: string; name: string }) => {
    haptic('light')
    if (token) setAuth(token, c.id, c.name, refreshToken || undefined)
    setOpen(false)
  }

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('សូមដាក់ឈ្មោះ'); return }
    haptic('medium')
    setSaving(true)
    try {
      const company = await api.post<{ id: string; name: string }>('/companies', {
        name: newName.trim(),
        type: newType,
        currency_base: newCurrency,
      })
      haptic('success')
      await refetch()
      if (token) setAuth(token, company.id, company.name, refreshToken || undefined)
      setCreating(false)
      setOpen(false)
      setNewName('')
      setNewType('general')
      setNewCurrency('USD')
    } catch (e: any) {
      haptic('error')
      toast.error(e.message || 'Failed to create company')
    }
    setSaving(false)
  }

  return (
    <>
      <button
        onClick={() => { haptic('light'); setOpen(true) }}
        className="flex items-center gap-2 px-4 py-2 rounded-[16px] active:scale-95 transition-all shadow-sm group"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--gold-soft)' }}>
          <Icon name="building" size={14} color="var(--gold)" />
        </div>
        <span className="text-sm font-black truncate max-w-[160px] uppercase tracking-wide" style={{ color: 'var(--text)' }}>
          {name || 'ក្រុមហ៊ុនរបស់ខ្ញុំ'}
        </span>
        <Icon name="chevronDown" size={14} color="var(--text-dim)" />
      </button>

      <BottomSheet isOpen={open} onClose={() => { setOpen(false); setCreating(false) }} title={creating ? 'បង្កើតអាជីវកម្មថ្មី' : 'ជ្រើសរើសក្រុមហ៊ុន'}>
        {creating ? (
          <div className="space-y-4">
            {/* Back button */}
            <button
              onClick={() => setCreating(false)}
              className="flex items-center gap-1.5 text-xs font-bold opacity-60 active:opacity-100"
              style={{ color: 'var(--text-sec)' }}
            >
              <Icon name="chevron" size={12} color="var(--text-sec)" /> ត្រលប់ / Back
            </button>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-dim)' }}>
                ឈ្មោះ / Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="ឧ. ហាងលក់ស្រូវ"
                autoFocus
                className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-dim)' }}>
                ប្រភេទ / Type
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {TYPES.map(tp => (
                  <button
                    key={tp.value}
                    onClick={() => { haptic('light'); setNewType(tp.value) }}
                    className="py-2.5 rounded-xl text-center transition-all active:scale-95"
                    style={{
                      background: newType === tp.value ? 'var(--gold)' : 'var(--card)',
                      border: `1px solid ${newType === tp.value ? 'var(--gold)' : 'var(--border)'}`,
                      color: newType === tp.value ? '#000' : 'var(--text-sec)',
                    }}
                  >
                    <div className="text-[10px] font-black">{tp.label}</div>
                    <div className="text-[9px] opacity-70">{tp.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--border)' }}>
              {(['USD', 'KHR'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => { haptic('light'); setNewCurrency(c) }}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: newCurrency === c ? 'var(--card)' : 'transparent',
                    color: newCurrency === c ? 'var(--gold)' : 'var(--text-dim)',
                  }}
                >
                  {c === 'USD' ? '$ USD' : '៛ KHR'}
                </button>
              ))}
            </div>

            <button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="w-full py-3.5 rounded-xl text-sm font-black active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--gold)', color: '#000' }}
            >
              {saving ? '...' : '✓ បង្កើត / Create'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className="w-full flex items-center justify-between p-4 rounded-2xl active:scale-[0.98] transition-transform"
                style={{
                  background: c.id === companyId ? 'var(--gold)' : 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: c.id === companyId ? '#000' : 'var(--text)',
                }}
              >
                <div className="flex items-center gap-3">
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

            {/* Create new company — shown when under the 3-company limit */}
            {companies.length < 3 && (
              <button
                onClick={() => { haptic('light'); setCreating(true) }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-[0.98] transition-transform"
                style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--gold-soft)' }}>
                  <Icon name="plus" size={18} color="var(--gold)" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm" style={{ color: 'var(--gold)' }}>+ បន្ថែមអាជីវកម្ម</div>
                  <div className="text-xs opacity-60" style={{ color: 'var(--text-sec)' }}>Create new company ({companies.length}/3)</div>
                </div>
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  )
}

