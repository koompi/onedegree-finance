import Icon from './Icon'
import { useI18nStore } from '../store/i18nStore'

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
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full sm:max-w-[400px] z-40 flex justify-around items-center"
      style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', padding: '8px 4px calc(16px + var(--safe-area-bottom))' }}>
      {tabs.map((t) => {
        const isActive = active === t.key
        return (
          <button key={t.key} onClick={() => onTab(t.key)} className="flex flex-col items-center gap-1 px-2 py-1 active:scale-95 transition-all">
            <div className="flex items-center justify-center rounded-xl transition-colors"
              style={{ width: 34, height: 34, background: isActive ? 'var(--gold-soft)' : 'transparent' }}>
              <Icon name={t.icon} size={18} color={isActive ? 'var(--gold)' : 'var(--text-sec)'} />
            </div>
            <span className="text-[9px] font-bold transition-colors"
              style={{ color: isActive ? 'var(--gold)' : 'var(--text-dim)', opacity: isActive ? 1 : 0.5 }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
