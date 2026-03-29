import { useNavigate, useLocation } from 'react-router-dom'
import { Home, ArrowLeftRight, BarChart2, Package, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const tabs: { path: string; matchPaths?: string[]; icon: LucideIcon; label: string }[] = [
  { path: '/', icon: Home, label: 'ដើម' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'ប្រតិបត្តិការ' },
  { path: '/report', icon: BarChart2, label: 'របាយការណ៍' },
  { path: '/inventory', icon: Package, label: 'ស្តុក' },
  { path: '/settings', icon: Settings, label: 'កំណត់' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex justify-around pb-[env(safe-area-inset-bottom)] z-50"
      style={{ height: `calc(64px + env(safe-area-inset-bottom))` }}>
      {tabs.map(tab => {
        const paths = tab.matchPaths || [tab.path]
        const active = tab.path === '/' ? pathname === '/' : paths.some(p => pathname.startsWith(p))
        const Icon = tab.icon
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
              active ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
