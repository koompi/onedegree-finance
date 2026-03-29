import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { haptic, tg } from '../lib/telegram'
import { Toast, useToast } from '../components/Toast'
import BottomNav from '../components/BottomNav'
import { ArrowDownLeft } from 'lucide-react'

export default function Receivables() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)
  const [showAdd, setShowAdd] = useState(false)
  const { toast, show: showToast } = useToast()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')

  const { data: items, isLoading } = useQuery({
    queryKey: ['receivables', companyId],
    queryFn: () => api.get(`/companies/${companyId}/receivables`).then(r => r.data),
    enabled: !!companyId,
  })

  const addMutation = useMutation({
    mutationFn: () => api.post(`/companies/${companyId}/receivables`, {
      contact_name: name,
      amount_cents: Math.round(parseFloat(amount) * 100),
      currency: 'USD',
      due_date: dueDate || undefined,
      note: note || undefined,
    }),
    onSuccess: () => {
      haptic.success()
      showToast('បានរក្សាទុករួចរាល់! ✓')
      queryClient.invalidateQueries({ queryKey: ['receivables'] })
      setShowAdd(false); setName(''); setAmount(''); setDueDate(''); setNote(''); setNote('')
    },
  })

  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/companies/${companyId}/receivables/${id}`, { status: 'paid' }),
    onSuccess: () => {
      haptic.success()
      showToast('បានរក្សាទុករួចរាល់! ✓')
      queryClient.invalidateQueries({ queryKey: ['receivables'] })
    },
  })

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-20 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
      <div className="flex items-center p-4">
        <button type="button" onClick={() => navigate(-1)} className="text-2xl mr-3 text-gray-500 active:opacity-60">&larr;</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">គេជំពាក់ខ្ញុំ</h1>
        <button type="button" onClick={() => setShowAdd(!showAdd)}
          className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-[0.98] transition-all shadow-sm">
          + បន្ថែម
        </button>
      </div>

      {showAdd && (
        <div className="mx-4 mb-4 p-4 bg-white rounded-2xl shadow-sm space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ឈ្មោះ"
            autoComplete="off" className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-gray-900 placeholder-gray-400 text-sm" />
          <input type="text" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="ចំនួន ($)"
            autoComplete="off" className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-gray-900 placeholder-gray-400 text-sm" />
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-gray-900 text-sm" />
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="កំណត់ចំណាំ"
            autoComplete="off" className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-gray-900 placeholder-gray-400 text-sm" />
          <button type="button" onClick={() => addMutation.mutate()} disabled={!name || !amount || addMutation.isPending}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all shadow-sm">
            {addMutation.isPending ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="px-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl shadow-sm animate-pulse" />)}
        </div>
      ) : !items?.length ? (
        <div className="text-center py-16">
          <div className="flex justify-center mb-3">
            <ArrowDownLeft size={40} className="text-gray-300" />
          </div>
          <p className="text-gray-400">គ្មានអ្នកជំពាក់</p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {items.map((item: { id: string; contact_name: string; amount_cents: number; status: string; due_date?: string; note?: string }) => {
          
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${companyId}/receivables/${id}`),
    onSuccess: () => {
      haptic.success()
      showToast('បានលុបរួចរាល់!')
      queryClient.invalidateQueries({ queryKey: ['receivables'] })
      setConfirmDeleteId(null)
    },
    onError: () => haptic.error(),
  })

  const isOverdue = item.due_date && item.due_date < today && item.status !== 'paid'
            return (
              <div key={item.id} className={`flex items-center p-4 rounded-2xl shadow-sm transition-all duration-200 ${
                item.status === 'paid' ? 'bg-emerald-50' : isOverdue ? 'bg-rose-50 border border-rose-200' : 'bg-white'
              }`}>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.contact_name}</p>
                {(item as any).note && <p className="text-xs text-gray-400 mt-0.5">{(item as any).note}</p>}
                  <p className={`text-lg font-bold mt-0.5 ${
                    item.status === 'paid' ? 'text-emerald-600 line-through' : isOverdue ? 'text-rose-600' : 'text-amber-600'
                  }`}>${(item.amount_cents / 100).toFixed(2)}</p>
                  {item.due_date && (
                    <p className={`text-xs mt-0.5 ${isOverdue ? 'text-rose-500 font-medium' : 'text-gray-400'}`}>
                      កំណត់: {item.due_date}
                    </p>
                  )}
                  {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  {item.status !== 'paid' && (
                    <button type="button" onClick={() => markPaid.mutate(item.id)}
                      className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-medium active:opacity-70 shadow-sm">
                      បានបង់
                    </button>
                  )}
                  {confirmDeleteId === item.id ? (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => deleteMutation.mutate(item.id)}
                        className="bg-rose-600 text-white px-2 py-1 rounded-lg text-xs font-bold active:opacity-70">លុប</button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)}
                        className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs active:opacity-70">X</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDeleteId(item.id)}
                      className="text-rose-400 text-xs active:opacity-70 px-1">លុប</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
