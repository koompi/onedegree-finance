import Icon from './Icon'
import { haptic } from '../lib/telegram'

export default function ScreenHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 pb-4 sticky top-0 z-30" style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
      <button 
        onClick={() => { haptic('light'); onBack() }} 
        className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm" 
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <Icon name="back" size={20} color="var(--gold)" />
      </button>
      <div className="flex-1 text-center text-lg font-black uppercase tracking-tight truncate px-2" style={{ color: 'var(--text)' }}>{title}</div>
      <div className="w-10 flex justify-end">{right || <div className="w-10" />}</div>
    </div>
  )
}
