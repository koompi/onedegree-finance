import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { haptic } from '../lib/telegram'
import BottomNav from '../components/BottomNav'

export default function Settings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId, setCompany, logout } = useAuth()
  const [showNewCompany, setShowNewCompany] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })

  const createCompany = useMutation({
    mutationFn: () => api.post('/companies', { name: newName }),
    onSuccess: (res) => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setCompany(res.data.id)
      setShowNewCompany(false); setNewName('')
    },
  })

  const deleteCompany = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${id}`),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-20 animate-fadeIn">
      <div className="flex items-center p-4">
        <button type="button" onClick={() => navigate('/')} className="text-2xl mr-3 text-gray-500 active:opacity-60">&larr;</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">ការកំណត់</h1>
      </div>

      <div className="px-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">ក្រុមហ៊ុន</p>
            <button type="button" onClick={() => setShowNewCompany(!showNewCompany)}
              className="text-indigo-600 text-sm font-medium active:opacity-70">+ បន្ថែម</button>
          </div>

          {showNewCompany && (
            <div className="mb-3 flex gap-2">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="ឈ្មោះក្រុមហ៊ុន"
                autoComplete="off" className="flex-1 p-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-gray-900 placeholder-gray-400" />
              <button type="button" onClick={() => createCompany.mutate()} disabled={!newName}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 active:scale-[0.98] transition-all shadow-sm">
                រក្សាទុក
              </button>
            </div>
          )}

          {companies?.map((c: { id: string; name: string; type: string }) => (
            <div key={c.id} className={`flex items-center justify-between py-2.5 ${companyId === c.id ? '' : 'border-t border-gray-50'}`}>
              <button type="button" onClick={() => setCompany(c.id)} className="text-left flex-1">
                <p className={`text-sm ${companyId === c.id ? 'font-semibold text-indigo-600' : 'text-gray-800'}`}>{c.name}</p>
                <p className="text-xs text-gray-400">{c.type}</p>
              </button>
              {companies.length > 1 && (
                <button type="button" onClick={() => { if (confirm('លុបក្រុមហ៊ុន?')) deleteCompany.mutate(c.id) }}
                  className="text-rose-400 text-xs font-medium active:opacity-70">លុប</button>
              )}
            </div>
          ))}
        </div>

        <button type="button" onClick={() => { logout(); navigate('/') }}
          className="w-full bg-rose-50 text-rose-600 py-3 rounded-2xl font-semibold border border-rose-100 active:scale-[0.98] transition-all shadow-sm">
          ចាកចេញ
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
