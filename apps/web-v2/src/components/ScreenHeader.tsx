import Icon from './Icon'
export default function ScreenHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}>
      <button onClick={onBack} className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90" style={{ background: 'var(--gold-soft)' }}>
        <Icon name="back" size={18} color="var(--gold)" />
      </button>
      <div className="flex-1 text-center text-base font-extrabold" style={{ color: 'var(--text)' }}>{title}</div>
      <div className="w-8">{right || null}</div>
    </div>
  )
}
