import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  visible: boolean
  type?: 'success' | 'error'
}

export function Toast({ message, visible, type = 'success' }: ToastProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const t = setTimeout(() => setShow(false), 2500)
      return () => clearTimeout(t)
    }
  }, [visible])

  if (!show) return null

  return (
    <div className={`fixed top-16 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-all duration-300 ${
      type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
    }`}>
      <span className="text-lg">{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
    </div>
  )
}

// Simple hook for toast state
export function useToast() {
  const [state, setState] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const show = (message: string, type: 'success' | 'error' = 'success') => {
    setState({ visible: true, message, type })
    // Force re-trigger if same message shown again
    setTimeout(() => setState(s => ({ ...s, visible: false })), 2600)
  }

  return { toast: state, show }
}
