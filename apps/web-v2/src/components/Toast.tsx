import { useToastStore } from '../store/toastStore'
import { useEffect } from 'react'

const variants: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: 'var(--green-soft)', border: 'var(--green-border)', icon: '✓' },
  error: { bg: 'var(--red-soft)', border: 'var(--red-border)', icon: '✕' },
  warning: { bg: 'var(--orange-soft)', border: 'var(--orange-border)', icon: '⚠' },
  info: { bg: 'var(--blue-soft)', border: 'var(--blue-border)', icon: 'ℹ' },
}

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div className="fixed top-3 left-4 right-4 z-[9999] flex flex-col gap-2 animate-slideDown">
      {toasts.map((t) => {
        const v = variants[t.variant] || variants.info
        return (
          <div key={t.id} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: v.bg, border: `1px solid ${v.border}`, color: `var(--${t.variant === 'success' ? 'green' : t.variant === 'error' ? 'red' : t.variant === 'warning' ? 'orange' : 'blue'})` }}>
            <span>{v.icon}</span>
            <span>{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
