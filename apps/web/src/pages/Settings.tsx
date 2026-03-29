import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { haptic, tg } from '../lib/telegram'
import BottomNav from '../components/BottomNav'
import { Download, User } from 'lucide-react'

type Category = { id: string; name: string; name_km?: string; icon: string; type: 'income' | 'expense'; is_default?: boolean }

const EMOJIS = ['🛒','🏠','🚗','💊','🍚','📱','⚡','💧','🎓','👗','🛠️','🐄','🌾','🐟','☕','📦','💰','🏦','🤝','📋']

export default function Settings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId, setCompany, logout } = useAuth()
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)

  const [showNewCompany, setShowNewCompany] = useState(false)
  const [newName, setNewName] = useState('')
  const [showAddCat, setShowAddCat] = useState(false)
  const [catType, setCatType] = useState<'income' | 'expense'>('expense')
  const [catEmoji, setCatEmoji] = useState('📦')
  const [catName, setCatName] = useState('')
  const [catNameKm, setCatNameKm] = useState('')
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense')
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'KM')
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'USD')

  const tgUser = (tg as any).initDataUnsafe?.user

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

  const toggleLang = (l: string) => { setLang(l); localStorage.setItem('lang', l) }
  const toggleCurrency = (c: string) => { setCurrency(c); localStorage.setItem('currency', c) }

  const exportData = async () => {
    const months: string[] = []
    const now = new Date()
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    const allTxns = []
    for (const m of months) {
      try {
        const res = await api.get(`/companies/${companyId}/transactions?month=${m}&limit=500`)
        allTxns.push(...res.data)
      } catch { /* skip */ }
    }
    const blob = new Blob([JSON.stringify(allTxns, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `onedegree-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    haptic.success()
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-20 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
      <div className="flex items-center p-4">
        <h1 className="text-xl font-bold text-gray-900 flex-1">ការកំណត់</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Profile */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <User size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{tgUser?.first_name || ''} {tgUser?.last_name || ''}</p>
              {tgUser?.username && <p className="text-sm text-gray-400">@{tgUser.username}</p>}
            </div>
          </div>
        </div>

        {/* Language & Currency */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">ភាសា / Language</p>
            <div className="flex gap-2">
              {['KM', 'EN'].map(l => (
                <button key={l} type="button" onClick={() => toggleLang(l)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    lang === l ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-500'
                  }`}>{l === 'KM' ? 'ខ្មែរ' : 'English'}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">រូបិយប័ណ្ណ / Currency</p>
            <div className="flex gap-2">
              {['USD', 'KHR'].map(c => (
                <button key={c} type="button" onClick={() => toggleCurrency(c)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currency === c ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-500'
                  }`}>{c}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Export */}
        <button type="button" onClick={exportData}
          className="w-full flex items-center justify-center gap-2 bg-white text-indigo-600 py-3 rounded-2xl font-semibold text-sm shadow-sm border border-indigo-100 active:opacity-70">
          <Download size={16} /> នាំចេញទិន្នន័យ (6 ខែ)
        </button>

        {/* Categories */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">ប្រភេទចំណូល/ចំណាយ</p>
            <button type="button" onClick={() => setShowAddCat(!showAddCat)}
              className="text-indigo-600 text-sm font-medium active:opacity-70">+ បន្ថែម</button>
          </div>
          <div className="flex gap-2 mb-3">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} type="button" onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === t ? t === 'expense' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-500'
                }`}>{t === 'expense' ? 'ចំណាយ' : 'ចំណូល'}</button>
            ))}
          </div>
          {showAddCat && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setCatType(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium ${
                      catType === t ? t === 'expense' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-500'
                    }`}>{t === 'expense' ? 'ចំណាយ' : 'ចំណូល'}</button>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">រើorg សញ្ញា</p>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => setCatEmoji(e)}
                      className={`text-xl p-1.5 rounded-lg ${catEmoji === e ? 'bg-indigo-100 ring-2 ring-indigo-400' : ''}`}>{e}</button>
                  ))}
                </div>
              </div>
              <input type="text" value={catNameKm} onChange={e => setCatNameKm(e.target.value)} placeholder="ឈ្មោះជាភាសាខ្មែរ" autoComplete="off"
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400" />
              <input type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Name in English" autoComplete="off"
                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400" />
              <button type="button" onClick={() => addCategory.mutate()} disabled={(!catName && !catNameKm) || addCategory.isPending}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-40">
                {addCategory.isPending ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</button>
            </div>
          )}
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">គ្មានប្រភេទ</p>
          ) : (
            <div className="space-y-1">
              {filtered.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-2">
                  <span className="text-2xl">{c.icon}</span>
                  <span className="flex-1 text-sm text-gray-800">{c.name_km || c.name}</span>
                  {!c.is_default && (
                    <button type="button" onClick={() => { if (confirm('លុបប្រភេទនេះ?')) deleteCategory.mutate(c.id) }}
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
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="ឈ្មោះក្រុមហ៊ុន" autoComplete="off"
                className="flex-1 p-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400" />
              <button type="button" onClick={() => createCompany.mutate()} disabled={!newName}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40">រក្សាទុក</button>
            </div>
          )}
          {companies?.map((c: { id: string; name: string; type: string }) => (
            <div key={c.id} className="flex items-center justify-between py-2.5 border-t border-gray-50 first:border-0">
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
          className="w-full bg-rose-50 text-rose-600 py-3 rounded-2xl font-semibold border border-rose-100 active:opacity-70 shadow-sm">
          ចាកចេញ
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
