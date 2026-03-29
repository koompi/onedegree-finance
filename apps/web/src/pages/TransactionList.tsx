import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { haptic, tg } from '../lib/telegram'
import { useAuth } from '../store/auth'
import BottomNav from '../components/BottomNav'
import { ArrowLeftRight, DollarSign, Search, Pencil, Trash2 } from 'lucide-react'

type Transaction = {
  id: string; type: string; amount_cents: number; category_icon: string;
  category_name_km: string; category_name: string; note: string;
  account_name: string; occurred_at: string
}

export default function TransactionList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', companyId, month],
    queryFn: () => api.get(`/companies/${companyId}/transactions?month=${month}&limit=100`).then(r => r.data),
    enabled: !!companyId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${companyId}/transactions/${id}`),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
      setExpandedId(null)
    },
    onError: () => haptic.error(),
  })

  const filtered = (transactions as Transaction[] | undefined)?.filter(t => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (t.category_name_km || '').toLowerCase().includes(q)
      || (t.category_name || '').toLowerCase().includes(q)
      || (t.note || '').toLowerCase().includes(q)
  })

  const grouped: Record<string, Transaction[]> = {}
  filtered?.forEach(t => {
    const day = t.occurred_at.slice(0, 10)
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(t)
  })

  const prevMonth = () => {
    const d = new Date(month + '-01'); d.setMonth(d.getMonth() - 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const d = new Date(month + '-01'); d.setMonth(d.getMonth() + 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-32 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
      <div className="flex items-center p-4">
        <button type="button" onClick={() => navigate(-1)} className="text-2xl mr-3 text-gray-500 active:opacity-60">&larr;</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">ប្រតិបត្តិការ</h1>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="flex items-center bg-white rounded-xl shadow-sm px-3 py-2.5">
          <Search size={16} className="text-gray-400 mr-2" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ស្វែងរក..." autoComplete="off"
            className="flex-1 outline-none text-sm text-gray-900 placeholder-gray-400 bg-transparent" />
        </div>
      </div>



      {isLoading ? (
        <div className="px-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl shadow-sm animate-pulse" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <div className="flex justify-center mb-3">
            <ArrowLeftRight size={40} className="text-gray-300" />
          </div>
          <p className="text-gray-400">គ្មានប្រតិបត្តិការ</p>
        </div>
      ) : (
        Object.entries(grouped).map(([day, txs]) => (
          <div key={day} className="mb-2">
            <div className="flex justify-between px-4 mb-1">
              <p className="text-xs text-gray-400 font-medium">{day}</p>
              <p className="text-xs font-medium text-gray-500">
                {txs.reduce((sum, t) => t.type === 'income' ? sum + t.amount_cents : sum - t.amount_cents, 0) >= 0 ? '+' : ''}${(txs.reduce((sum, t) => t.type === 'income' ? sum + t.amount_cents : sum - t.amount_cents, 0) / 100).toFixed(2)}
              </p>
            </div>
            {txs.map(tx => (
              <div key={tx.id} className="mx-4 mb-1">
                <button type="button" className="w-full flex items-center px-4 py-3 bg-white rounded-2xl shadow-sm text-left"
                  onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}>
                  {tx.category_icon ? (
                    <span className="text-2xl mr-3">{tx.category_icon}</span>
                  ) : (
                    <span className="mr-3"><DollarSign size={24} className="text-gray-400" /></span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{tx.category_name_km || tx.category_name || 'ផ្សេងៗ'}</p>
                    {tx.note && <p className="text-xs text-gray-400 truncate">{tx.note}</p>}
                  </div>
                  <span className={`font-bold text-sm ml-3 ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}${(tx.amount_cents / 100).toFixed(2)}
                  </span>
                </button>
                {expandedId === tx.id && (
                  <div className="flex gap-2 mt-1 px-2 pb-1">
                    <button type="button" onClick={() => navigate(`/transaction/edit/${tx.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-600 py-2 rounded-xl text-sm font-medium active:opacity-70">
                      <Pencil size={14} /> កែប្រែ
                    </button>
                    {confirmDeleteId === tx.id ? (
                      <div className="flex-1 flex gap-1">
                        <button type="button" onClick={() => { deleteMutation.mutate(tx.id); setConfirmDeleteId(null) }}
                          className="flex-1 bg-rose-600 text-white py-2 rounded-xl text-sm font-bold active:opacity-70">
                          លុបពិតប្រាកដ
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-medium active:opacity-70">
                          បោះបង់
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmDeleteId(tx.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50 text-rose-600 py-2 rounded-xl text-sm font-medium active:opacity-70">
                        <Trash2 size={14} /> លុប
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}

      {/* Month nav at bottom */}
      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex items-center justify-between px-6 py-2 z-20">
        <button type="button" onClick={prevMonth} className="p-2 text-gray-400 active:text-gray-600 text-lg">‹</button>
        <span className="font-semibold text-gray-700 text-sm">{month}</span>
        <button type="button" onClick={nextMonth} className="p-2 text-gray-400 active:text-gray-600 text-lg">›</button>
      </div>

      <BottomNav />
    </div>
  )
}
