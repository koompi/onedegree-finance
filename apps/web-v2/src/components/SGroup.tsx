export default function SGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[11px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-dim)' }}>{title}</div>
      <div className="rounded-2xl px-4" style={{ background: 'var(--card)' }}>{children}</div>
    </div>
  )
}
