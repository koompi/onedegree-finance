const v: Record<string, { bg: string; color: string }> = {
  success: { bg: 'var(--green-soft)', color: 'var(--green)' },
  error: { bg: 'var(--red-soft)', color: 'var(--red)' },
  warning: { bg: 'var(--orange-soft)', color: 'var(--orange)' },
  info: { bg: 'var(--blue-soft)', color: 'var(--blue)' },
  gold: { bg: 'var(--gold-soft)', color: 'var(--gold)' },
  neutral: { bg: 'var(--border)', color: 'var(--text-sec)' },
}
export default function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant: keyof typeof v }) {
  const s = v[variant] || v.neutral
  return <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{children}</span>
}
