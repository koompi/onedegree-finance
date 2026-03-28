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
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl font-bold text-indigo-600">1°</div>
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
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
      <div className="min-h-screen p-6 bg-[#FBFBFA]">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl font-bold text-indigo-600">1°</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">បង្កើតអាជីវកម្មរបស់អ្នក</h1>
        {user && <p className="text-sm text-gray-500 mb-6">សួស្ដី {user.name} 👋</p>}
        {!user && <p className="text-sm text-gray-400 mb-6">ចាប់ផ្ដើមគ្រប់គ្រងហិរញ្ញប្បទានរបស់អ្នក</p>}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4">
            <p className="text-rose-600 text-sm">{error}</p>
          </div>
        )}

        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ឈ្មោះអាជីវកម្ម</label>
        <input
          type="text"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="ឧ. ហាងលក់គ្រឿងទេស"
          className="w-full p-4 bg-white border border-gray-200 rounded-xl mb-6 text-lg text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all duration-200"
          autoComplete="off"
          autoCorrect="off"
        />

        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ប្រភេទអាជីវកម្ម</label>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {types.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setCompanyType(t.value)}
              className={`p-3 rounded-xl text-center text-sm border transition-all duration-200 ${
                companyType === t.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold scale-[1.02]'
                  : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{t.icon}</div>
              <div className="text-xs">{t.label}</div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCreateCompany}
          disabled={!companyName.trim() || busy}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-40 active:scale-[0.98] transition-all duration-200 hover:bg-indigo-700"
        >
          {busy ? 'កំពុងបង្កើត...' : 'បន្ត →'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-[#FBFBFA]">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl font-bold text-indigo-600">1°</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">បន្ថែមគណនីដំបូង</h1>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4">
          <p className="text-rose-600 text-sm">{error}</p>
        </div>
      )}

      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ប្រាក់របស់អ្នកនៅទីណា?</label>
      <input
        type="text"
        value={accountName}
        onChange={e => setAccountName(e.target.value)}
        placeholder="ឈ្មោះគណនី"
        className="w-full p-4 bg-white border border-gray-200 rounded-xl mb-2 text-lg text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all duration-200"
        autoComplete="off"
        autoCorrect="off"
      />
      <p className="text-xs text-gray-400 mb-8">ឧ. សាច់ប្រាក់ក្នុងដៃ, ABA Bank, Wing</p>

      <button
        type="button"
        onClick={handleCreateAccount}
        disabled={!accountName.trim() || busy}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-40 active:scale-[0.98] transition-all duration-200 hover:bg-emerald-700"
      >
        {busy ? 'កំពុងរក្សាទុក...' : '✓ ចាប់ផ្ដើមប្រើ'}
      </button>
    </div>
  )
}
