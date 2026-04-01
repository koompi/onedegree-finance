import ScreenHeader from '../components/ScreenHeader'
import SGroup from '../components/SGroup'
import SRow from '../components/SRow'
import Toggle from '../components/Toggle'
import Icon from '../components/Icon'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../store/i18nStore'

export default function SettingsScreen({ onNavigate, toggleTheme, isDark }: {
  onNavigate: (s: any) => void; toggleTheme: () => void; isDark: boolean
}) {
  const [notif, setNotif] = useState(true)
  const { companyName, logout } = useAuthStore()
  const { lang, setLang, currency, setCurrency, t } = useI18nStore()

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
            <SRow iconName="telegram" label={t('settings_tg_account')} />
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
