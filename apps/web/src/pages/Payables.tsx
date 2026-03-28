import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { haptic } from '../lib/telegram'

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
    <div className="min-h-screen pb-4">
      <div className="flex items-center p-4">
        <button onClick={() => navigate('/')} className="text-2xl mr-3">&larr;</button>
        <h1 className="text-xl font-bold flex-1">ខ្ញុំជំពាក់គេ</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">+ បន្ថែម</button>
      </div>

      {showAdd && (
        <div className="mx-4 mb-4 p-4 bg-gray-50 rounded-xl space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ឈ្មោះ" className="w-full p-2 rounded-lg border border-gray-200" />
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="ចំនួន ($)" type="text" inputMode="numeric" className="w-full p-2 rounded-lg border border-gray-200" />
          <button onClick={() => addMutation.mutate()} disabled={!name || !amount || addMutation.isPending}
            className="w-full bg-blue-500 text-white py-2 rounded-lg disabled:opacity-50">
            {addMutation.isPending ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      ) : !items?.length ? (
        <p className="text-center text-gray-400 py-12">គ្មានការជំពាក់</p>
      ) : (
        <div className="px-4 space-y-2">
          {items.map((item: { id: string; contact_name: string; amount_cents: number; status: string }) => (
            <div key={item.id} className={`flex items-center p-3 rounded-xl border ${item.status === 'paid' ? 'border-green-100 bg-green-50' : 'border-purple-100 bg-white'}`}>
              <div className="flex-1">
                <p className="font-medium">{item.contact_name}</p>
                <p className={`text-lg font-bold ${item.status === 'paid' ? 'text-green-600 line-through' : 'text-purple-600'}`}>
                  ${(item.amount_cents / 100).toFixed(2)}
                </p>
              </div>
              {item.status !== 'paid' && (
                <button onClick={() => markPaid.mutate(item.id)} className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm">បានបង់</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
