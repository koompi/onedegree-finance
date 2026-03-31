export default function EmptyState({ icon, title, subtitle, action }: {
  icon: string; title: string; subtitle?: string; action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-base font-extrabold mb-1" style={{ color: 'var(--text)' }}>{title}</div>
      {subtitle && <div className="text-[13px] leading-relaxed" style={{ color: 'var(--text-sec)' }}>{subtitle}</div>}
      {action && (
        <button onClick={action.onClick} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors"
          style={{ background: 'var(--gold-soft)', color: 'var(--gold)', borderColor: 'var(--gold)' }}>
          {action.label}
        </button>
      )}
    </div>
  )
}
