import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

export default function Report() {
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const { data: report, isLoading } = useQuery({
    queryKey: ['report-detail', companyId, month],
    queryFn: () => api.get(`/companies/${companyId}/reports/monthly?month=${month}`).then(r => r.data),
    enabled: !!companyId,
  })

  return (
    <div className="min-h-screen pb-4">
      <div className="flex items-center p-4">
        <button onClick={() => navigate('/')} className="text-2xl mr-3">&larr;</button>
        <h1 className="text-xl font-bold flex-1">របាយការណ៍ប្រចាំខែ</h1>
      </div>

      <div className="flex items-center justify-between px-4 mb-4">
        <button onClick={() => {
          const d = new Date(month + '-01'); d.setMonth(d.getMonth() - 1)
          setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }} className="p-2 text-lg">&larr;</button>
        <span className="font-medium">{month}</span>
        <button onClick={() => {
          const d = new Date(month + '-01'); d.setMonth(d.getMonth() + 1)
          setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }} className="p-2 text-lg">&rarr;</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      ) : report ? (
        <div className="px-4 space-y-4">
          <div className={`rounded-2xl p-4 text-center ${report.net_profit_cents >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-sm text-gray-500">ប្រាក់ចំណេញសុទ្ធ</p>
            <p className={`text-3xl font-bold ${report.net_profit_cents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${(report.net_profit_cents / 100).toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-xs text-green-500">ចំណូលសរុប</p>
              <p className="text-xl font-bold text-green-600">${(report.total_income_cents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-xs text-red-500">ចំណាយសរុប</p>
              <p className="text-xl font-bold text-red-600">${(report.total_expense_cents / 100).toFixed(2)}</p>
            </div>
          </div>

          {report.income_by_category?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-sm font-medium mb-3 text-green-600">ចំណូលតាមប្រភេទ</p>
              {report.income_by_category.map((c: { category_name: string; category_name_km: string; amount_cents: number }, i: number) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">{c.category_name_km || c.category_name}</span>
                  <span className="text-sm font-medium text-green-600">${(c.amount_cents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {report.expense_by_category?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-sm font-medium mb-3 text-red-600">ចំណាយតាមប្រភេទ</p>
              {report.expense_by_category.map((c: { category_name: string; category_name_km: string; amount_cents: number }, i: number) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">{c.category_name_km || c.category_name}</span>
                  <span className="text-sm font-medium text-red-600">${(c.amount_cents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
              <p className="text-xs text-orange-500">គេជំពាក់ខ្ញុំ</p>
              <p className="text-lg font-bold text-orange-600">${(report.receivables_total_cents / 100).toFixed(2)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
              <p className="text-xs text-purple-500">ខ្ញុំជំពាក់គេ</p>
              <p className="text-lg font-bold text-purple-600">${(report.payables_total_cents / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
