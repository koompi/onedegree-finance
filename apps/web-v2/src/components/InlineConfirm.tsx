export default function InlineConfirm({ message, onConfirm, onCancel, confirmLabel = 'លុប', cancelLabel = 'បោះបង់' }: {
  message?: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; cancelLabel?: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl mt-1 animate-fadeIn" style={{ background: 'var(--red-soft)' }}>
      <span className="flex-1 text-xs font-semibold" style={{ color: 'var(--red)' }}>{message || 'លុបពិតប្រាកដ?'}</span>
      <button onClick={onCancel} className="px-3 py-1 rounded-lg text-xs font-bold" style={{ color: 'var(--text-sec)', background: 'var(--border)' }}>{cancelLabel}</button>
      <button onClick={onConfirm} className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ background: 'var(--red)' }}>{confirmLabel}</button>
    </div>
  )
}
