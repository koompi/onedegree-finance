import ScreenHeader from '../components/ScreenHeader'
import SGroup from '../components/SGroup'
import SRow from '../components/SRow'
import Toggle from '../components/Toggle'
import Icon from '../components/Icon'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export default function SettingsScreen({ onNavigate, toggleTheme, isDark }: {
  onNavigate: (s: any) => void; toggleTheme: () => void; isDark: boolean
}) {
  const [notif, setNotif] = useState(true)
  const { companyName, logout } = useAuthStore()

  return (
    <div className="min-h-screen animate-fadeIn">
      <ScreenHeader title="កំណត់" onBack={() => onNavigate('dashboard')} />
      <div className="px-4 space-y-1">
        <button onClick={() => onNavigate('companyProfile')} className="w-full rounded-2xl p-4 flex items-center gap-3 mt-3 active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg, rgba(232,184,75,0.12) 0%, rgba(212,160,58,0.08) 100%)', border: '1px solid var(--gold-med)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gold)' }}>
            <Icon name="building" size={20} color="var(--bg)" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-extrabold" style={{ color: 'var(--gold)' }}>{companyName || 'ក្រុមហ៊ុនរបស់ខ្ញុំ'}</div>
            <div className="text-[11px]" style={{ color: 'var(--gold)', opacity: 0.7 }}>ចុចដើម្បីកែសម្រួល</div>
          </div>
          <Icon name="chevron" size={16} color="var(--gold)" />
        </button>
        <SGroup title="អាជីវកម្ម">
          <SRow iconName="building" label="ព័ត៌មានក្រុមហ៊ុន" onClick={() => onNavigate('companyProfile')} />
          <SRow iconName="tag" label="ប្រភេទចំណូលចំណាយ" onClick={() => onNavigate('categories')} />
          <SRow iconName="wallet" label="គណនី" onClick={() => onNavigate('accounts')} />
        </SGroup>
        <SGroup title="កម្មវិធី">
          <SRow iconName="bell" label="ការជូនដំណឹង" sublabel="រំលឹកប្រតិបត្តិការ" right={<Toggle on={notif} onToggle={() => setNotif(!notif)} />} />
          <SRow iconName={isDark ? 'moon' : 'sun'} label={isDark ? 'មុខងារងងឹត' : 'មុខងារពន្លឺ'} onClick={toggleTheme} />
          <SRow iconName="globe" label="ភាសា" sublabel="ភាសាខ្មែរ" />
        </SGroup>
        <SGroup title="សុវត្ថិភាព">
          <SRow iconName="telegram" label="គណនី Telegram" />
          <SRow iconName="info" label="អំពី OneDegree Finance" />
        </SGroup>
        <button onClick={logout} className="w-full mt-6 mb-8 py-3 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
          ចាកចេញពីគណនី
        </button>
      </div>
    </div>
  )
}
