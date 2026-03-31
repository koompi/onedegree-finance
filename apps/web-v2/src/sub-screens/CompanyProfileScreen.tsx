import { useState, useEffect } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAuthStore } from '../store/authStore'
import { useCompany } from '../hooks/useCompany'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'
import { useI18nStore } from '../store/i18nStore'

export default function CompanyProfileScreen({ onBack }: { onBack: () => void }) {
  const companyId = useAuthStore(s => s.companyId)
  const { isLoading, currentCompany, update } = useCompany()
  const { t, lang } = useI18nStore()

  const [name, setName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [taxId, setTaxId] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentCompany) {
      setName(currentCompany.name || '')
      setBusinessType(currentCompany.business_type || '')
      setTaxId(currentCompany.tax_id || '')
      setPhone(currentCompany.phone || '')
      setAddress(currentCompany.address || '')
    }
  }, [currentCompany])

  const handleSave = async () => {
    if (!companyId) return
    setSaving(true)
    try {
      haptic('success')
      await update(companyId, { name, business_type: businessType, tax_id: taxId, phone, address })
      toast.success(t('tx_saved_success'))
      setIsEditing(false)
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
    setSaving(false)
  }

  if (isLoading) return <div className="min-h-screen animate-fadeIn relative"><ScreenHeader title={t('profile_title')} onBack={onBack} /><div className="px-4 pt-3"><SkeletonLoader rows={5} /></div></div>

  return (
    <div className="min-h-screen animate-fadeIn relative">
      <ScreenHeader title={t('profile_title')} onBack={onBack}
        right={isEditing ? undefined : <button onClick={() => setIsEditing(true)} className="text-xs font-bold" style={{ color: 'var(--gold)' }}>{lang === 'km' ? 'កែ' : 'Edit'}</button>} />
      <div className="px-4 space-y-4">
        <div className="flex flex-col items-center py-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(232,184,75,0.2)' }}>
            <Icon name="building" size={28} color="var(--bg)" />
          </div>
          <div className="text-base font-extrabold mt-2" style={{ color: 'var(--text)' }}>{currentCompany?.name || t('settings_my_company')}</div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <Field label={t('profile_form_business')} value={name} onChange={setName} />
            <Field label={t('categories_form_type')} value={businessType} onChange={setBusinessType} placeholder="e.g. LLC" />
            <Field label="Tax ID" value={taxId} onChange={setTaxId} placeholder="Tax ID" />
            <Field label={t('profile_form_phone')} value={phone} onChange={setPhone} placeholder="012 345 678" />
            <Field label={t('profile_form_address')} value={address} onChange={setAddress} placeholder="Address" />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-3.5 rounded-xl text-sm font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>{t('tx_delete_cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>{saving ? '...' : t('tx_form_save')}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <InfoRow icon="building" label={t('profile_form_business')} value={currentCompany?.name} />
            <InfoRow icon="tag" label={t('categories_form_type')} value={currentCompany?.business_type} />
            <InfoRow icon="wallet" label="Tax ID" value={currentCompany?.tax_id} />
            <InfoRow icon="telegram" label={t('profile_form_phone')} value={currentCompany?.phone} />
            <InfoRow icon="globe" label={t('profile_form_address')} value={currentCompany?.address} />
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <div className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gold-soft)' }}>
        <Icon name={icon as any} size={14} color="var(--gold)" />
      </div>
      <div>
        <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{label}</div>
        <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{value || '-'}</div>
      </div>
    </div>
  )
}
