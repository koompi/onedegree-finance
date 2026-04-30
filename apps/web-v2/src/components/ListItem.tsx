import Icon from './Icon'
import { haptic } from '../lib/telegram'

export default function ListItem({ icon, iconBg, title, subtitle, right, rightSub, rightColor, onPress, showChevron, actions }: {
  icon: React.ReactNode; iconBg?: string; title: string; subtitle?: string
  right?: React.ReactNode | string; rightSub?: string; rightColor?: string
  onPress?: () => void; showChevron?: boolean
  actions?: Array<{ label: string; color: string; bg: string; onClick: () => void }>
}) {
  return (
    <div 
      onClick={() => { if (onPress) { haptic('light'); onPress() } }} 
      className="flex items-center gap-4 px-4 py-3 active:scale-[0.98] active:bg-white/5 transition-all rounded-2xl mb-1 group" 
      style={{ cursor: onPress ? 'pointer' : 'default', background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform group-active:scale-95" 
           style={{ background: iconBg || 'var(--gold-soft)', border: '1px solid var(--border-light)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-black tracking-tight truncate uppercase" style={{ color: 'var(--text)' }}>{title}</div>
        {subtitle && <div className="text-[11px] font-medium truncate mt-0.5 opacity-60" style={{ color: 'var(--text-sec)' }}>{subtitle}</div>}
      </div>
      <div className="text-right shrink-0">
        {right && <div className="text-[13px] font-black font-mono-num tracking-tighter" style={{ color: rightColor || 'var(--text)' }}>{right}</div>}
        {rightSub && <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mt-0.5" style={{ color: 'var(--text-dim)' }}>{rightSub}</div>}
      </div>
      {showChevron && (
        <div className="opacity-30 group-hover:opacity-100 transition-opacity ml-1">
          <Icon name="chevronDown" size={14} color="var(--text-dim)" className="-rotate-90" />
        </div>
      )}
    </div>
  )
}
