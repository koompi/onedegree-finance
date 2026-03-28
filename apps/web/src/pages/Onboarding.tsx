import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { tg } from '../lib/telegram'
import axios from 'axios'
import type { AxiosError } from 'axios'
import { Leaf, Store, ShoppingCart, Wrench, Package, Wallet, Landmark, CheckCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const API_URL = 'https://onedegree-api.tunnel.koompi.cloud'

const types: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'agro', label: 'កសិកម្ម', icon: Leaf },
  { value: 'general', label: 'ទូទៅ', icon: Store },
  { value: 'retail', label: 'លក់រាយ', icon: ShoppingCart },
  { value: 'service', label: 'សេវាកម្ម', icon: Wrench },
  { value: 'other', label: 'ផ្សេងៗ', icon: Package },
]

function getHeaders(): Record<string, string> {
  const tk = useAuth.getState().token
  return tk ? { Authorization: `Bearer ${tk}` } : {}
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: i < step ? '100%' : '0%' }}
          />
        </div>
      ))}
      <span className="text-xs text-gray-400 font-medium ml-1">{step}/{total}</span>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const login = useAuth(s => s.login)
  const token = useAuth(s => s.token)
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
    if (token) {
      setScreen('company')
      return
    }
    const timer = setTimeout(() => {
      const initData = tg.initData
      if (initData && initData.length > 0) {
        login(initData)
          .then(() => setScreen('company'))
          .catch((e: any) => { console.log('Login error:', e?.response?.data); setScreen('company') })
      } else {
        setScreen('company')
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [token])

  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7FF]">
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
      navigate('/')
    } catch (e) {
      const err = e as AxiosError<{ error: string }>
      setError(err?.response?.data?.error || err?.message || 'បង្កើតមិនបានទេ')
      setBusy(false)
    }
  }

  if (screen === 'company') {
    return (
      <div className="min-h-screen p-6 bg-[#F8F7FF] animate-fadeIn">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl font-bold text-indigo-600">1°</span>
        </div>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Wallet size={48} className="text-indigo-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">បង្កើតអាជីវកម្មរបស់អ្នក</h1>
          {user && <p className="text-sm text-gray-500">សួស្ដី {user.name}</p>}
          {!user && <p className="text-sm text-gray-400">ចាប់ផ្ដើមគ្រប់គ្រងហិរញ្ញប្បទានរបស់អ្នក</p>}
        </div>

        <ProgressBar step={1} total={2} />

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 mb-4 shadow-sm">
            <p className="text-rose-600 text-sm">{error}</p>
          </div>
        )}

        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ឈ្មោះអាជីវកម្ម</label>
        <input
          type="text"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="ឧ. ហាងលក់គ្រឿងទេស"
          className="w-full p-4 bg-white border border-gray-200 rounded-2xl mb-6 text-lg text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all duration-200 shadow-sm"
          autoComplete="off"
          autoCorrect="off"
        />

        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ប្រភេទអាជីវកម្ម</label>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {types.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setCompanyType(t.value)}
                className={`p-4 rounded-2xl text-center border-2 transition-all duration-200 shadow-sm ${
                  companyType === t.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold scale-[1.02]'
                    : 'border-gray-100 text-gray-600 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex justify-center mb-1.5">
                  <Icon size={28} />
                </div>
                <div className="text-xs font-medium">{t.label}</div>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleCreateCompany}
          disabled={!companyName.trim() || busy}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-40 active:scale-[0.98] transition-all duration-200 hover:bg-indigo-700 shadow-sm"
        >
          {busy ? 'កំពុងបង្កើត...' : 'បន្ត →'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-[#F8F7FF] animate-fadeIn">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl font-bold text-indigo-600">1°</span>
      </div>

      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <Landmark size={48} className="text-indigo-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">បន្ថែមគណនីដំបូង</h1>
        <p className="text-sm text-gray-400">ប្រាក់របស់អ្នកនៅទីណា?</p>
      </div>

      <ProgressBar step={2} total={2} />

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 mb-4 shadow-sm">
          <p className="text-rose-600 text-sm">{error}</p>
        </div>
      )}

      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ឈ្មោះគណនី</label>
      <input
        type="text"
        value={accountName}
        onChange={e => setAccountName(e.target.value)}
        placeholder="ឈ្មោះគណនី"
        className="w-full p-4 bg-white border border-gray-200 rounded-2xl mb-2 text-lg text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all duration-200 shadow-sm"
        autoComplete="off"
        autoCorrect="off"
      />
      <p className="text-xs text-gray-400 mb-8">ឧ. សាច់ប្រាក់ក្នុងដៃ, ABA Bank, Wing</p>

      <button
        type="button"
        onClick={handleCreateAccount}
        disabled={!accountName.trim() || busy}
        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-40 active:scale-[0.98] transition-all duration-200 hover:bg-emerald-700 shadow-sm"
      >
        <span className="flex items-center justify-center gap-2">
          <CheckCircle size={20} />
          {busy ? 'កំពុងរក្សាទុក...' : 'ចាប់ផ្ដើមប្រើ'}
        </span>
      </button>
    </div>
  )
}
