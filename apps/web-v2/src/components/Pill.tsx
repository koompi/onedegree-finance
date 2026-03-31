export default function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
      style={{ background: active ? 'var(--gold)' : 'var(--border)', color: active ? 'var(--bg)' : 'var(--text-sec)' }}>
      {label}
    </button>
  )
}
