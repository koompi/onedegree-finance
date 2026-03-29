import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { haptic, tg } from '../lib/telegram'

export default function Accounts() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'cash' | 'bank' | 'mobile_money'>('cash')
  const [balance, setBalance] = useState('')

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts', companyId],
    queryFn: () => api.get(`/companies/${companyId}/accounts`).then(r => r.data),
    enabled: !!companyId,
  })

  const addMutation = useMutation({
    mutationFn: () => api.post(`/companies/${companyId}/accounts`, {
      name,
      type,
      balance_cents: Math.round(parseFloat(balance || '0') * 100),
    }),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
      setShowAdd(false); setName(''); setBalance('')
    },
    onError: () => haptic.error(),
  })

  const typeLabels: Record<string, string> = {
    cash: '💵 សាច់ប្រាក់',
    bank: '🏦 ធនាគារ',
    mobile_money: '📱 ទូរសព្ទ',
  }

  return (
    <div className="min-h-screen pb-4" style={{ paddingTop: `${safeTop}px` }}>
      <div className="flex items-center p-4">
        <button onClick={() => navigate('/')} className="text-2xl mr-3">&larr;</button>
        <h1 className="text-xl font-bold flex-1">គណនី / Accounts</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">+ បន្ថែម</button>
      </div>

      {showAdd && (
        <div className="mx-4 mb-4 p-4 bg-gray-50 rounded-xl space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ឈ្មោះគណនី"
            className="w-full p-2 rounded-lg border border-gray-200" />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ប្រភេទ / Type</label>
            <div className="flex gap-2">
              {(['cash', 'bank', 'mobile_money'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium ${type === t ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200'}`}>
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          </div>
          <input value={balance} onChange={e => setBalance(e.target.value)} placeholder="សមតុល្យដំបូង ($)" type="number"
            className="w-full p-2 rounded-lg border border-gray-200" />
          <button onClick={() => addMutation.mutate()} disabled={!name || addMutation.isPending}
            className="w-full bg-blue-500 text-white py-2 rounded-lg disabled:opacity-50">
            {addMutation.isPending ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      ) : !accounts?.length ? (
        <p className="text-center text-gray-400 py-12">គ្មានគណនី</p>
      ) : (
        <div className="px-4 space-y-2">
          {accounts.map((a: { id: string; name: string; type: string; balance_cents?: number }) => (
            <div key={a.id} className="flex items-center p-4 bg-white rounded-xl border border-gray-100">
              <span className="text-2xl mr-3">
                {a.type === 'bank' ? '🏦' : a.type === 'mobile_money' ? '📱' : '💵'}
              </span>
              <div className="flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-gray-400">{typeLabels[a.type] || a.type}</p>
              </div>
              <span className="font-bold text-lg">
                ${((a.balance_cents || 0) / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
