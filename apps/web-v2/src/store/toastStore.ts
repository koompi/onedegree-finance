import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  variant: 'success' | 'error' | 'warning' | 'info'
}

interface ToastStore {
  toasts: Toast[]
  show: (message: string, variant: Toast['variant'], duration?: number) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, variant, duration = 3000) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().show(msg, 'success'),
  error: (msg: string) => useToastStore.getState().show(msg, 'error'),
  warning: (msg: string) => useToastStore.getState().show(msg, 'warning'),
  info: (msg: string) => useToastStore.getState().show(msg, 'info'),
}
