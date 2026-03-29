import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { haptic, tg } from '../lib/telegram'
import BottomNav from '../components/BottomNav'

type Category = { id: string; name: string; name_km?: string; icon: string; type: 'income' | 'expense'; is_default?: boolean }

const EMOJIS = ['🛒','🏠','🚗','💊','🍚','📱','⚡','💧','🎓','👗','🛠️','🐄','🌾','🐟','☕','📦','💰','🏦','🤝','📋']

export default function Settings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId, setCompany, logout } = useAuth()
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)

  const [showNewCompany, setShowNewCompany] = useState(false)
  const [newName, setNewName] = useState('')

  // Category state
  const [showAddCat, setShowAddCat] = useState(false)
  const [catType, setCatType] = useState<'income' | 'expense'>('expense')
  const [catEmoji, setCatEmoji] = useState('📦')
  const [catName, setCatName] = useState('')
  const [catNameKm, setCatNameKm] = useState('')
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense')

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories', companyId],
    queryFn: () => api.get(`/companies/${companyId}/categories`).then(r => r.data),
    enabled: !!companyId,
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

  const addCategory = useMutation({
    mutationFn: () => api.post(`/companies/${companyId}/categories`, {
      name: catName || catNameKm,
      name_km: catNameKm || catName,
      icon: catEmoji,
      type: catType,
    }),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setShowAddCat(false)
      setCatName(''); setCatNameKm(''); setCatEmoji('📦')
    },
    onError: () => haptic.error(),
  })

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${companyId}/categories/${id}`),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const filtered = categories?.filter(c => c.type === activeTab) || []

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-20 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
      <div className="flex items-center p-4">
        <h1 className="text-xl font-bold text-gray-900 flex-1">ការកំណត់</h1>
      </div>

      <div className="px-4 space-y-4">

        {/* Categories */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">ប្រភេទចំណូល/ចំណាយ</p>
            <button type="button" onClick={() => setShowAddCat(!showAddCat)}
              className="text-indigo-600 text-sm font-medium active:opacity-70">+ បន្ថែម</button>
          </div>

          {/* Tab */}
          <div className="flex gap-2 mb-3">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} type="button" onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === t
                    ? t === 'expense' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                    : 'bg-gray-50 text-gray-500'
                }`}>
                {t === 'expense' ? 'ចំណាយ' : 'ចំណូល'}
              </button>
            ))}
          </div>

          {/* Add form */}
          {showAddCat && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setCatType(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium ${
                      catType === t
                        ? t === 'expense' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-500'
                    }`}>
                    {t === 'expense' ? 'ចំណាយ' : 'ចំណូល'}
                  </button>
                ))}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">រើសសញ្ញា</p>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => setCatEmoji(e)}
                      className={`text-xl p-1.5 rounded-lg ${catEmoji === e ? 'bg-indigo-100 ring-2 ring-indigo-400' : ''}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <input type="text" value={catNameKm} onChange={e => setCatNameKm(e.target.value)}
                placeholder="ឈ្មោះជាភាសាខ្មែរ" autoComplete="off"
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400" />
              <input type="text" value={catName} onChange={e => setCatName(e.target.value)}
                placeholder="Name in English" autoComplete="off"
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400" />

              <button type="button"
                onClick={() => addCategory.mutate()}
                disabled={(!catName && !catNameKm) || addCategory.isPending}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-40">
                {addCategory.isPending ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
              </button>
            </div>
          )}

          {/* Category list */}
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">គ្មានប្រភេទ</p>
          ) : (
            <div className="space-y-1">
              {filtered.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-2">
                  <span className="text-2xl">{c.icon}</span>
                  <span className="flex-1 text-sm text-gray-800">{c.name_km || c.name}</span>
                  {!c.is_default && (
                    <button type="button"
                      onClick={() => { if (confirm('លុបប្រភេទនេះ?')) deleteCategory.mutate(c.id) }}
                      className="text-rose-400 text-xs active:opacity-70">លុប</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Companies */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">ក្រុមហ៊ុន</p>
            <button type="button" onClick={() => setShowNewCompany(!showNewCompany)}
              className="text-indigo-600 text-sm font-medium active:opacity-70">+ បន្ថែម</button>
          </div>

          {showNewCompany && (
            <div className="mb-3 flex gap-2">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="ឈ្មោះក្រុមហ៊ុន" autoComplete="off"
                className="flex-1 p-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400" />
              <button type="button" onClick={() => createCompany.mutate()} disabled={!newName}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40">
                រក្សាទុក
              </button>
            </div>
          )}

          {companies?.map((c: { id: string; name: string; type: string }) => (
            <div key={c.id} className="flex items-center justify-between py-2.5 border-t border-gray-50 first:border-0">
              <button type="button" onClick={() => setCompany(c.id)} className="text-left flex-1">
                <p className={`text-sm ${companyId === c.id ? 'font-semibold text-indigo-600' : 'text-gray-800'}`}>{c.name}</p>
                <p className="text-xs text-gray-400">{c.type}</p>
              </button>
              {companies.length > 1 && (
                <button type="button"
                  onClick={() => { if (confirm('លុបក្រុមហ៊ុន?')) deleteCompany.mutate(c.id) }}
                  className="text-rose-400 text-xs font-medium active:opacity-70">លុប</button>
              )}
            </div>
          ))}
        </div>

        {/* Logout */}
        <button type="button" onClick={() => { logout(); navigate('/') }}
          className="w-full bg-rose-50 text-rose-600 py-3 rounded-2xl font-semibold border border-rose-100 active:opacity-70 shadow-sm">
          ចាកចេញ
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
