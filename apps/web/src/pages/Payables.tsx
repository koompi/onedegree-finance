import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { haptic } from '../lib/telegram'
import BottomNav from '../components/BottomNav'
import { CreditCard } from 'lucide-react'

export default function Payables() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')

  const { data: items, isLoading } = useQuery({
    queryKey: ['payables', companyId],
    queryFn: () => api.get(`/companies/${companyId}/payables`).then(r => r.data),
    enabled: !!companyId,
  })

  const addMutation = useMutation({
    mutationFn: () => api.post(`/companies/${companyId}/payables`, {
      contact_name: name,
      amount_cents: Math.round(parseFloat(amount) * 100),
      currency: 'USD',
    }),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['payables'] })
      setShowAdd(false); setName(''); setAmount('')
    },
  })

  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/companies/${companyId}/payables/${id}`, { status: 'paid' }),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['payables'] })
    },
  })

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-20 animate-fadeIn">
      <div className="flex items-center p-4">
        <button type="button" onClick={() => navigate('/')} className="text-2xl mr-3 text-gray-500 active:opacity-60">&larr;</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">ខ្ញុំជំពាក់គេ</h1>
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
            <CreditCard size={40} className="text-gray-300" />
          </div>
          <p className="text-gray-400">គ្មានការជំពាក់</p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {items.map((item: { id: string; contact_name: string; amount_cents: number; status: string }) => (
            <div key={item.id} className={`flex items-center p-4 rounded-2xl shadow-sm transition-all duration-200 ${
              item.status === 'paid' ? 'bg-emerald-50' : 'bg-white'
            }`}>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{item.contact_name}</p>
                <p className={`text-lg font-bold mt-0.5 ${
                  item.status === 'paid' ? 'text-emerald-600 line-through' : 'text-violet-600'
                }`}>${(item.amount_cents / 100).toFixed(2)}</p>
              </div>
              {item.status !== 'paid' && (
                <button type="button" onClick={() => markPaid.mutate(item.id)}
                  className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-[0.98] transition-all shadow-sm">
                  បានបង់
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
