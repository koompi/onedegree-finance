export default function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="relative shrink-0 transition-colors duration-200 rounded-full"
      style={{ width: 44, height: 24, background: on ? 'var(--gold)' : 'rgba(255,255,255,0.1)' }}>
      <div className="absolute top-2 left-2 w-5 h-5 rounded-full transition-transform duration-200"
        style={{ background: on ? 'var(--bg)' : 'var(--text-dim)', transform: on ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  )
}
