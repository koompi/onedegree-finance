import { useState } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { haptic } from '../lib/telegram'
import { toast } from '../store/toastStore'

const TYPES = [
  { value: 'general', label: 'ទូទៅ', sub: 'General' },
  { value: 'retail', label: 'លក់រាយ', sub: 'Retail' },
  { value: 'service', label: 'សេវាកម្ម', sub: 'Service' },
  { value: 'agro', label: 'កសិកម្ម', sub: 'Agro' },
  { value: 'other', label: 'ផ្សេងទៀត', sub: 'Other' },
]

export default function CreateCompanyScreen() {
  const { token, refreshToken, setAuth } = useAuthStore()
  const [name, setName] = useState('')
  const [type, setType] = useState('general')
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('សូមដាក់ឈ្មោះក្រុមហ៊ុន')
      return
    }
    haptic('medium')
    setSaving(true)
    try {
      const company = await api.post<{ id: string; name: string }>('/companies', {
        name: name.trim(),
        type,
        currency_base: currency,
      })
      haptic('success')
      setAuth(token!, company.id, company.name, refreshToken || undefined)
    } catch (e: any) {
      haptic('error')
      toast.error(e.message || 'Failed to create company')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[360px] space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-5xl mb-2">🏢</div>
          <div className="text-2xl font-black" style={{ color: 'var(--text)' }}>បង្កើតអាជីវកម្ម</div>
          <div className="text-sm" style={{ color: 'var(--text-sec)' }}>Create your business to get started</div>
        </div>

        {/* Company Name */}
        <div>
          <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-dim)' }}>
            ឈ្មោះអាជីវកម្ម / Business Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ឧ. ហាងលក់ស្រូវ, ABC Services"
            autoFocus
            className="w-full py-4 px-4 rounded-2xl text-base font-semibold outline-none transition-all focus:ring-2"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          />
        </div>

        {/* Business Type */}
        <div>
          <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-dim)' }}>
            ប្រភេទ / Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => { haptic('light'); setType(t.value) }}
                className="py-3 px-2 rounded-xl text-center transition-all active:scale-95"
                style={{
                  background: type === t.value ? 'var(--gold)' : 'var(--card)',
                  border: `1px solid ${type === t.value ? 'var(--gold)' : 'var(--border)'}`,
                  color: type === t.value ? '#000' : 'var(--text-sec)',
                }}
              >
                <div className="text-xs font-black">{t.label}</div>
                <div className="text-[10px] opacity-70">{t.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Base Currency */}
        <div>
          <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-dim)' }}>
            រូបិយប័ណ្ណ / Currency
          </label>
          <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            {(['USD', 'KHR'] as const).map(c => (
              <button
                key={c}
                onClick={() => { haptic('light'); setCurrency(c) }}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: currency === c ? 'var(--gold)' : 'transparent',
                  color: currency === c ? '#000' : 'var(--text-sec)',
                }}
              >
                {c === 'USD' ? '$ USD' : '៛ KHR'}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="w-full py-4 rounded-2xl text-base font-black active:scale-95 transition-all disabled:opacity-50 shadow-gold"
          style={{ background: 'var(--gold)', color: '#000' }}
        >
          {saving ? '...' : '✓ បង្កើតឥឡូវ / Create Now'}
        </button>
      </div>
    </div>
  )
}
