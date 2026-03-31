import { useEffect, useRef } from 'react'

export default function BottomSheet({ isOpen, onClose, title, children, height = 'auto' }: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; height?: 'auto' | 'full' | number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isOpen) ref.current?.scrollIntoView({ behavior: 'smooth' })
  }, [isOpen])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 animate-fadeIn">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 animate-slideUp rounded-t-3xl overflow-y-auto"
        style={{ background: 'var(--card)', maxHeight: typeof height === 'number' ? height : height === 'full' ? '100vh' : '85vh', paddingTop: 'var(--safe-area-top)' }}>
        <div className="sticky top-0 z-10 pt-2 pb-3 text-center" style={{ background: 'var(--card)' }}>
          <div className="w-9 h-1 rounded-full mx-auto mb-3" style={{ background: 'var(--border)' }} />
          <div className="text-base font-extrabold" style={{ color: 'var(--text)' }}>{title}</div>
        </div>
        <div className="px-4 pb-8 safe-bottom" ref={ref}>{children}</div>
      </div>
    </div>
  )
}
