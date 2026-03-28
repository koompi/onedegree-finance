import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../store/auth'
import { tg } from '../lib/telegram'
import axios from 'axios'
import type { AxiosError } from 'axios'

const API_URL = 'https://onedegree-api.tunnel.koompi.cloud'

const types = [
  { value: 'agro', label: 'កសិកម្ម', icon: '🌾' },
  { value: 'general', label: 'ទូទៅ', icon: '🏪' },
  { value: 'retail', label: 'លក់រាយ', icon: '🛒' },
  { value: 'service', label: 'សេវាកម្ម', icon: '🔧' },
  { value: 'other', label: 'ផ្សេងៗ', icon: '📦' },
]

function getHeaders(): Record<string, string> {
  const tk = useAuth.getState().token
  return tk ? { Authorization: `Bearer ${tk}` } : {}
}

export default function Onboarding() {
  const login = useAuth(s => s.login)
  const user = useAuth(s => s.user)
  const setCompany = useAuth(s => s.setCompany)
  const [screen, setScreen] = useState<'loading' | 'company' | 'account'>('loading')
  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState('general')
  const [accountName, setAccountName] = useState('សាច់ប្រាក់ក្នុងដៃ')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const companyIdRef = useRef<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      const initData = tg.initData
      if (initData && initData.length > 0) {
        login(initData)
          .then(() => setScreen('company'))
          .catch(() => setScreen('company'))
      } else {
        setScreen('company')
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [])

  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-5xl font-bold text-blue-600">1°</div>
      </div>
    )
  }

  const handleCreateCompany = async () => {
    if (!companyName.trim() || busy) return
    setBusy(true); setError('')
    try {
      const res = await axios.post(`${API_URL}/companies`, {
        name: companyName.trim(), type: companyType,
      }, { headers: getHeaders() })
      companyIdRef.current = res.data.id
      setCompany(res.data.id)
      setScreen('account')
    } catch (e) {
      const err = e as AxiosError<{ error: string }>
      setError(err?.response?.data?.error || err?.message || 'បង្កើតមិនបានទេ')
    } finally { setBusy(false) }
  }

  const handleCreateAccount = async () => {
    if (!accountName.trim() || busy) return
    setBusy(true); setError('')
    try {
      const cid = companyIdRef.current
      if (!cid) { setError('មិនមាន ID ក្រុមហ៊ុន'); setBusy(false); return }
      await axios.post(`${API_URL}/companies/${cid}/accounts`, {
        name: accountName.trim(), type: 'cash',
      }, { headers: getHeaders() })
      window.location.href = '/'
    } catch (e) {
      const err = e as AxiosError<{ error: string }>
      setError(err?.response?.data?.error || err?.message || 'បង្កើតមិនបានទេ')
      setBusy(false)
    }
  }

  if (screen === 'company') {
    return (
      <div className="min-h-screen p-6 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-blue-600">1°</span>
          <h2 className="text-xl font-bold text-gray-900">បង្កើតអាជីវកម្មរបស់អ្នក</h2>
        </div>
        {user && <p className="text-sm text-blue-600 mb-4 font-medium">សួស្តី {user.name} 👋</p>}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"><p className="text-red-600 text-sm">{error}</p></div>}
        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
          placeholder="ឈ្មោះអាជីវកម្ម"
          className="w-full p-4 border-2 border-gray-200 rounded-2xl mb-6 text-lg focus:border-blue-400 outline-none text-gray-900 placeholder-gray-400"
          autoComplete="off" autoCorrect="off" />
        <p className="text-sm text-gray-800 mb-3 font-semibold">ប្រភេទអាជីវកម្ម</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {types.map(t => (
            <button key={t.value} type="button" onClick={() => setCompanyType(t.value)}
              className={`p-3 rounded-2xl text-center text-sm border-2 ${
                companyType === t.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-gray-200 text-gray-700 bg-white'
              }`}>
              <div className="text-2xl mb-1">{t.icon}</div>{t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={handleCreateCompany} disabled={!companyName.trim() || busy}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-40 active:bg-blue-700">
          {busy ? 'កំពុងបង្កើត...' : 'បន្ត →'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl font-bold text-blue-600">1°</span>
        <h2 className="text-xl font-bold text-gray-900">បន្ថែមគណនីដំបូង</h2>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"><p className="text-red-600 text-sm">{error}</p></div>}
      <p className="text-sm text-gray-800 mb-3 font-semibold">ប្រាក់របស់អ្នកនៅទីណា?</p>
      <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
        placeholder="ឈ្មោះគណនី"
        className="w-full p-4 border-2 border-gray-200 rounded-2xl mb-2 text-lg focus:border-blue-400 outline-none text-gray-900 placeholder-gray-400"
        autoComplete="off" autoCorrect="off" />
      <p className="text-xs text-gray-500 mb-8">ឧ. សាច់ប្រាក់ក្នុងដៃ, ABA Bank, Wing</p>
      <button type="button" onClick={handleCreateAccount} disabled={!accountName.trim() || busy}
        className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-40 active:bg-green-700">
        {busy ? 'កំពុងរក្សាទុក...' : '✓ ចាប់ផ្តើមប្រើ'}
      </button>
    </div>
  )
}
