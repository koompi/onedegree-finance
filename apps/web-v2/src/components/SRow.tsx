import Icon from './Icon'
export default function SRow({ iconName, iconColor, label, sublabel, right, onClick, last }: {
  iconName: string; iconColor?: string; label: string; sublabel?: string; right?: React.ReactNode; onClick?: () => void; last?: boolean
}) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 py-3.5 active:opacity-70"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--gold-soft)' }}>
        <Icon name={iconName as any} size={16} color={iconColor || 'var(--gold)'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
        {sublabel && <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{sublabel}</div>}
      </div>
      {right || null}
    </div>
  )
}
