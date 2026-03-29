import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { haptic, tg } from '../lib/telegram'
import BottomNav from '../components/BottomNav'
import { Wallet } from 'lucide-react'

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
    <div className="min-h-screen bg-[#F8F7FF] pb-20 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
      <div className="flex items-center p-4">
        <button type="button" onClick={() => navigate(-1)} className="text-2xl mr-3 text-gray-500 active:opacity-60">&larr;</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">គណនី / Accounts</h1>
        <button type="button" onClick={() => setShowAdd(!showAdd)} className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-[0.98] transition-all shadow-sm">+ បន្ថែម</button>
      </div>

      {showAdd && (
        <div className="mx-4 mb-4 p-4 bg-white rounded-2xl shadow-sm space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ឈ្មោះគណនី"
            autoComplete="off" className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-gray-900 placeholder-gray-400 text-sm" />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ប្រភេទ / Type</label>
            <div className="flex gap-2">
              {(['cash', 'bank', 'mobile_money'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${type === t ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500'}`}>
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          </div>
          <input value={balance} onChange={e => setBalance(e.target.value)} placeholder="សមតុល្យដំបូង ($)" type="number" inputMode="decimal"
            autoComplete="off" className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-gray-900 placeholder-gray-400 text-sm" />
          <button type="button" onClick={() => addMutation.mutate()} disabled={!name || addMutation.isPending}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all shadow-sm">
            {addMutation.isPending ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="px-4 space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-[72px] bg-white rounded-2xl shadow-sm animate-pulse" />)}
        </div>
      ) : !accounts?.length ? (
        <div className="text-center py-16">
          <div className="flex justify-center mb-3">
            <Wallet size={40} className="text-gray-300" />
          </div>
          <p className="text-gray-400 mb-4">គ្មានគណនី</p>
          <button type="button" onClick={() => setShowAdd(true)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium active:scale-[0.98] transition-all shadow-sm">
            + បន្ថែមគណនី
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {accounts.map((a: { id: string; name: string; type: string; balance_cents?: number }) => (
            <div key={a.id} className="flex items-center p-4 bg-white rounded-2xl shadow-sm">
              <span className="text-2xl mr-3">
                {a.type === 'bank' ? '🏦' : a.type === 'mobile_money' ? '📱' : '💵'}
              </span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{a.name}</p>
                <p className="text-xs text-gray-400">{typeLabels[a.type] || a.type}</p>
              </div>
              <span className="font-bold text-lg text-gray-900">
                ${((a.balance_cents || 0) / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
