import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

export default function TransactionList() {
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', companyId, month],
    queryFn: () => api.get(`/companies/${companyId}/transactions?month=${month}&limit=100`).then(r => r.data),
    enabled: !!companyId,
  })

  const grouped: Record<string, Array<{ id: string; type: string; amount_cents: number; category_icon: string; category_name_km: string; category_name: string; note: string; account_name: string; occurred_at: string }>> = {}
  transactions?.forEach((t: any) => {
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
    <div className="min-h-screen bg-[#FBFBFA] pb-4">
      <div className="flex items-center p-4">
        <button type="button" onClick={() => navigate('/')} className="text-2xl mr-3 text-gray-500 active:opacity-60">&larr;</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">ប្រតិបត្តិការ</h1>
      </div>

      <div className="flex items-center justify-between px-4 mb-4">
        <button type="button" onClick={prevMonth} className="p-2 text-gray-400 active:text-gray-600">&larr;</button>
        <span className="font-semibold text-gray-800">{month}</span>
        <button type="button" onClick={nextMonth} className="p-2 text-gray-400 active:text-gray-600">&rarr;</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-center text-gray-400 py-12">គ្មានប្រតិបត្តិការ</p>
      ) : (
        Object.entries(grouped).map(([day, txs]) => (
          <div key={day} className="mb-2">
            <p className="px-4 text-xs text-gray-400 font-medium mb-1">{day}</p>
            {txs.map(tx => (
              <div key={tx.id} className="flex items-center px-4 py-3 bg-white border-b border-gray-50">
                <span className="text-2xl mr-3">{tx.category_icon || '💵'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{tx.category_name_km || tx.category_name || 'ផ្សេងៗ'}</p>
                  {tx.note && <p className="text-xs text-gray-400 truncate">{tx.note}</p>}
                </div>
                <span className={`font-bold text-sm ml-3 ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.type === 'income' ? '+' : '-'}${(tx.amount_cents / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
