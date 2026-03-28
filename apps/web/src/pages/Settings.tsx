import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { haptic } from '../lib/telegram'

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
      setShowNewCompany(false)
      setNewName('')
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
    <div className="min-h-screen pb-4">
      <div className="flex items-center p-4">
        <button onClick={() => navigate('/')} className="text-2xl mr-3">&larr;</button>
        <h1 className="text-xl font-bold flex-1">ការកំណត់</h1>
      </div>

      <div className="px-4 space-y-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium">ក្រុមហ៊ុន</p>
            <button onClick={() => setShowNewCompany(!showNewCompany)} className="text-blue-500 text-sm">+ បន្ថែម</button>
          </div>

          {showNewCompany && (
            <div className="mb-3 flex gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="ឈ្មោះក្រុមហ៊ុន"
                className="flex-1 p-2 border border-gray-200 rounded-lg text-sm" />
              <button onClick={() => createCompany.mutate()} disabled={!newName}
                className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50">រក្សាទុក</button>
            </div>
          )}

          {companies?.map((c: { id: string; name: string; type: string }) => (
            <div key={c.id} className={`flex items-center justify-between py-2 ${companyId === c.id ? 'font-bold' : ''}`}>
              <button onClick={() => setCompany(c.id)} className="text-left flex-1">
                <p className="text-sm">{c.name}</p>
                <p className="text-xs text-gray-400">{c.type}</p>
              </button>
              <button onClick={() => { if (confirm('លុបក្រុមហ៊ុន?')) deleteCompany.mutate(c.id) }}
                className="text-red-400 text-xs">លុប</button>
            </div>
          ))}
        </div>

        <button onClick={() => { logout(); navigate('/') }}
          className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-medium border border-red-100">
          ចាកចេញ
        </button>
      </div>
    </div>
  )
}
