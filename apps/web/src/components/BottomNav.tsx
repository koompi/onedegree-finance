import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { path: '/', icon: '🏠', label: 'ដើម' },
  { path: '/transactions', icon: '📋', label: 'ប្រតិបត្តិការ' },
  { path: '/report', icon: '📊', label: 'របាយការណ៍' },
  { path: '/receivables', icon: '💵', label: 'គេជំពាក់' },
  { path: '/settings', icon: '⚙️', label: 'កំណត់' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex justify-around pb-[env(safe-area-inset-bottom)] z-50"
      style={{ height: `calc(64px + env(safe-area-inset-bottom))` }}>
      {tabs.map(tab => {
        const active = tab.path === '/' ? pathname === '/' : pathname.startsWith(tab.path)
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
              active ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
