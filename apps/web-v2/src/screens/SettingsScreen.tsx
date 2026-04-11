import ScreenHeader from '../components/ScreenHeader'
import SGroup from '../components/SGroup'
import SRow from '../components/SRow'
import Toggle from '../components/Toggle'
import Icon from '../components/Icon'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../store/i18nStore'
import { api } from '../lib/api'

export default function SettingsScreen({ onNavigate, toggleTheme, isDark }: {
  onNavigate: (s: any) => void; toggleTheme: () => void; isDark: boolean
}) {
  const [notif, setNotif] = useState(true)
  const [pairPin, setPairPin] = useState<string | null>(null)
  const [pairLoading, setPairLoading] = useState(false)
  const [pairError, setPairError] = useState(false)
  const [copied, setCopied] = useState(false)
  const { companyName, logout } = useAuthStore()
  const { lang, setLang, currency, setCurrency, t } = useI18nStore()

  async function generatePin() {
    setPairLoading(true)
    setPairError(false)
    setPairPin(null)
    try {
      const res = await api.post<{ code: string }>('/auth/pair-code', {})
      setPairPin(res.code)
    } catch {
      setPairError(true)
    } finally {
      setPairLoading(false)
    }
  }

  function copyPin() {
    if (!pairPin) return
    navigator.clipboard.writeText(`/pair ${pairPin}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-[100dvh] flex animate-fadeIn relative">
      <div className="flex-1 pb-10">
        <ScreenHeader title={t('settings_title')} onBack={() => onNavigate('dashboard')} />
        <div className="px-4 space-y-1">
          <button onClick={() => onNavigate('companyProfile')} className="w-full rounded-2xl p-4 flex items-center gap-3 mt-3 active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, rgba(232,184,75,0.12) 0%, rgba(212,160,58,0.08) 100%)', border: '1px solid var(--gold-med)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gold)' }}>
              <Icon name="building" size={20} color="var(--bg)" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-extrabold" style={{ color: 'var(--gold)' }}>{companyName || t('settings_my_company')}</div>
              <div className="text-[11px]" style={{ color: 'var(--gold)', opacity: 0.7 }}>{t('settings_tap_edit')}</div>
            </div>
            <Icon name="chevron" size={16} color="var(--gold)" />
          </button>
          <SGroup title={t('settings_business')}>
            <SRow iconName="building" label={t('settings_company_info')} onClick={() => onNavigate('companyProfile')} />
            <SRow iconName="tag" label={t('settings_categories')} onClick={() => onNavigate('categories')} />
            <SRow iconName="wallet" label={t('settings_accounts')} onClick={() => onNavigate('accounts')} />
            <SRow iconName="users" label={t('team_title')} onClick={() => onNavigate('teamMembers')} />
            <SRow iconName="refresh" label="ប្រតិបត្តិការដដែលៗ" sublabel="Recurring Transactions" onClick={() => onNavigate('recurring')} />
          </SGroup>
          <SGroup title={t('settings_app')}>
            <SRow iconName="bell" label={t('settings_notifications')} sublabel={t('settings_tx_reminders')} right={<Toggle on={notif} onToggle={() => setNotif(!notif)} />} />
            <SRow iconName={isDark ? 'moon' : 'sun'} label={isDark ? t('settings_dark_mode') : t('settings_light_mode')} onClick={toggleTheme} />
            <SRow iconName="globe" label={t('settings_language')} sublabel={lang === 'km' ? 'ភាសាខ្មែរ' : 'English'} onClick={() => setLang(lang === 'km' ? 'en' : 'km')} />
            <SRow
              iconName="wallet"
              label={lang === 'km' ? 'រូបិយប័ណ្ណ' : 'Currency'}
              sublabel={currency === 'KHR' ? '៛ KHR' : '$ USD'}
              right={
                <div className="flex items-center gap-1 rounded-full p-0.5" style={{ background: 'var(--border)' }}>
                  {(['KHR', 'USD'] as const).map(c => (
                    <button key={c} onClick={() => setCurrency(c)}
                      className="px-3 py-1 rounded-full text-[11px] font-black transition-all"
                      style={{
                        background: currency === c ? 'var(--gold)' : 'transparent',
                        color: currency === c ? '#000' : 'var(--text-dim)',
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              }
            />
          </SGroup>
          <SGroup title={t('settings_security')}>
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,136,204,0.15)' }}>
                  <Icon name="telegram" size={18} color="#0088CC" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t('settings_tg_account')}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{t('pair_subtitle')}</div>
                </div>
              </div>

              {!pairPin && (
                <div className="text-[11px] space-y-0.5" style={{ color: 'var(--text-dim)' }}>
                  <div>{t('pair_how')}</div>
                  <div>{t('pair_step1')}</div>
                  <div>{t('pair_step2')}</div>
                  <div>{t('pair_step3')}</div>
                </div>
              )}

              {pairPin && (
                <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div>
                    <div className="text-[10px] font-semibold mb-0.5" style={{ color: 'var(--text-dim)' }}>PIN</div>
                    <div className="text-2xl font-black tracking-[0.3em]" style={{ color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>{pairPin}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{t('pair_expires')}</div>
                  </div>
                  <button onClick={copyPin}
                    className="px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition-all"
                    style={{ background: copied ? 'var(--green-soft)' : 'var(--gold)', color: copied ? 'var(--green)' : '#000' }}>
                    {copied ? t('pair_copied') : t('pair_copy')}
                  </button>
                </div>
              )}

              {pairPin && (
                <div className="text-[11px] text-center py-1 rounded-lg" style={{ background: 'var(--card)', color: 'var(--text-dim)' }}>
                  {t('pair_instructions')}:{' '}
                  <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>/pair {pairPin}</span>
                </div>
              )}

              {pairError && (
                <div className="text-[11px] text-center" style={{ color: 'var(--red)' }}>{t('pair_error')}</div>
              )}

              <button onClick={generatePin} disabled={pairLoading}
                className="w-full py-2.5 rounded-xl text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-60"
                style={{ background: 'rgba(0,136,204,0.15)', color: '#0088CC', border: '1px solid rgba(0,136,204,0.3)' }}>
                {pairLoading ? t('pair_generating') : t('pair_generate_pin')}
              </button>
            </div>
            <SRow iconName="info" label={t('settings_about')} />
          </SGroup>
          <button onClick={logout} className="w-full mt-6 mb-8 py-3 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
            {t('settings_logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
