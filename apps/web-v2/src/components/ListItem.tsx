import Icon from './Icon'

export default function ListItem({ icon, iconBg, title, subtitle, right, rightSub, rightColor, onPress, showChevron, actions }: {
  icon: React.ReactNode; iconBg?: string; title: string; subtitle?: string
  right?: React.ReactNode | string; rightSub?: string; rightColor?: string
  onPress?: () => void; showChevron?: boolean
  actions?: Array<{ label: string; color: string; bg: string; onClick: () => void }>
}) {
  return (
    <div onClick={onPress} className="flex items-center gap-3 px-0 py-3 active:opacity-70" style={onPress ? { cursor: 'pointer' } : undefined}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: iconBg || 'var(--gold-soft)' }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{title}</div>
        {subtitle && <div className="text-[11px] truncate" style={{ color: 'var(--text-dim)' }}>{subtitle}</div>}
      </div>
      <div className="text-right shrink-0">
        {right && <div className="text-sm font-bold font-mono-num" style={{ color: rightColor || 'var(--text)' }}>{right}</div>}
        {rightSub && <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{rightSub}</div>}
      </div>
      {showChevron && <Icon name="chevron" size={16} color="var(--text-dim)" />}
    </div>
  )
}
