export default function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative shrink-0 transition-colors duration-200 rounded-full"
      style={{ width: 48, height: 28, background: on ? 'var(--gold)' : 'var(--border)' }}
    >
      <div
        className="absolute rounded-full shadow transition-transform duration-200"
        style={{
          width: 22,
          height: 22,
          top: 3,
          left: 3,
          background: 'white',
          transform: on ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}
