import Icon from './Icon'
import { useI18nStore } from '../store/i18nStore'
import { haptic } from '../lib/telegram'

export default function BottomNav({ active, onTab }: { active: string; onTab: (key: string) => void }) {
  const t = useI18nStore(s => s.t)
  const tabs = [
    { key: 'dashboard', label: t('nav_dashboard'), icon: 'dashboard' as const },
    { key: 'transactions', label: t('nav_transactions'), icon: 'transactions' as const },
    { key: 'receivables', label: t('nav_receivables'), icon: 'receivable' as const },
    { key: 'inventory', label: t('nav_inventory'), icon: 'inventory' as const },
    { key: 'settings', label: t('nav_settings'), icon: 'settings' as const },
  ]

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full sm:max-w-[420px] z-40 flex justify-around items-center px-2 py-3 backdrop-blur-xl"
      style={{ background: 'var(--nav-bg)', borderTop: '1px solid var(--border)', paddingBottom: 'calc(12px + var(--safe-area-bottom))' }}>
      {tabs.map((t) => {
        const isActive = active === t.key
        return (
          <button key={t.key} onClick={() => { haptic('light'); onTab(t.key) }} className="flex flex-col items-center gap-1.5 flex-1 relative py-1">
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full" style={{ background: 'var(--gold)' }} />
            )}
            <div className={`flex items-center justify-center rounded-2xl transition-all duration-300 ${isActive ? 'scale-110 shadow-gold' : 'opacity-60'}`}
              style={{ width: 44, height: 44, background: isActive ? 'var(--gold)' : 'transparent' }}>
              <Icon name={t.icon} size={22} color={isActive ? '#000000' : 'var(--text-sec)'} />
            </div>
            <span className="text-[10px] font-black transition-colors uppercase tracking-tight"
              style={{ color: isActive ? 'var(--gold)' : 'var(--text-dim)' }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
