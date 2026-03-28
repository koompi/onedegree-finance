import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../store/auth'
import { tg } from '../lib/telegram'
import { api } from '../lib/api'

export default function Onboarding() {
  const { login, setCompany, user, token } = useAuth()
  const [step, setStep] = useState<number | null>(null) // null = determining mode
  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState('general')
  const [accountName, setAccountName] = useState('សាច់ប្រាក់ក្នុងដៃ')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [apiError, setApiError] = useState('')

  // On mount: check if we're inside Telegram
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasInitData = tg.initData && tg.initData.length > 0
      if (hasInitData) {
        login(tg.initData)
          .then(() => setStep(1))
          .catch((e: any) => {
            const msg = e?.response?.data?.error || e?.message || 'Auto-login failed'
            setAuthError(msg)
            setStep(0) // Show manual button so they can retry
          })
      } else {
        setStep(0)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // If we somehow already have a token (returning user edge case), redirect
  useEffect(() => {
    if (token && step === null) setStep(1)
  }, [token, step])

  const handleLogin = async () => {
    setLoading(true)
    setAuthError('')
    setApiError('')
    try {
      await login('dev_mode')
      setStep(1)
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'ចូលមិនបានទេ'
      setAuthError(msg)
    } finally {
      setLoading(false)
    }
  }

  const createCompany = useMutation({
    mutationFn: async () => {
      setApiError('')
      const res = await api.post('/companies', { name: companyName, type: companyType })
      return res.data
    },
    onSuccess: (data) => {
      setCompany(data.id)
      setStep(2)
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || e?.message || 'បង្កើតមិនបានទេ'
      setApiError(msg)
    },
  })

  const createAccount = useMutation({
    mutationFn: async (companyId: string) => {
      setApiError('')
      const res = await api.post(`/companies/${companyId}/accounts`, { name: accountName, type: 'cash' })
      return res.data
    },
    onSuccess: () => {
      window.location.href = '/'
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || e?.message || 'បង្កើតមិនបានទេ'
      setApiError(msg)
    },
  })

  const types = [
    { value: 'agro', label: 'កសិកម្ម', icon: '🌾' },
    { value: 'general', label: 'ទូទៅ', icon: '🏪' },
    { value: 'retail', label: 'លក់រាយ', icon: '🛒' },
    { value: 'service', label: 'សេវាកម្ម', icon: '🔧' },
    { value: 'other', label: 'ផ្សេងៗ', icon: '📦' },
  ]

  // Loading state
  if (step === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-5xl font-bold text-blue-600 mb-3">1°</div>
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  // Step 0: Splash (browser or auth failure)
  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <div className="text-7xl mb-2 font-bold text-blue-600">1°</div>
        <h1 className="text-2xl font-bold mb-1 text-gray-900">OneDegree Finance</h1>
        <p className="text-gray-500 text-xs mb-8">by KOOMPI</p>
        <p className="text-gray-700 mb-8 text-sm leading-relaxed max-w-xs">
          តាមដានចំណូល ចំណាយ និងប្រាក់ចំណេញ<br/>សម្រាប់អាជីវកម្មខ្នាតតូច និងមធ្យម
        </p>
        {authError && <p className="text-red-500 text-sm mb-4 font-medium">{authError}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full max-w-xs bg-blue-500 text-white py-4 rounded-2xl font-medium text-lg disabled:opacity-50 shadow-lg"
        >
          {loading ? 'កំពុងចូល...' : '▶ Preview Demo'}
        </button>
        <p className="text-xs text-amber-600 mt-4 max-w-xs font-medium">
          ⚠️ Browser preview mode — open via Telegram for full experience
        </p>
        <p className="text-xs text-gray-500 mt-6 max-w-xs leading-relaxed">
          ទិន្នន័យរបស់អ្នកមានសុវត្ថិភាព។<br/>យើងមិនចែករំលែកជាមួយស្ថាប័នពន្ធដារទេ។
        </p>
      </div>
    )
  }

  // Step 1: Create company
  if (step === 1) {
    return (
      <div className="min-h-screen p-6 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-blue-600">1°</span>
          <h2 className="text-xl font-bold text-gray-900">បង្កើតអាជីវកម្មរបស់អ្នក</h2>
        </div>
        {user && (
          <p className="text-sm text-blue-600 mb-4 font-medium">សួស្តី {user.name} 👋</p>
        )}
        {!user && (
          <p className="text-sm text-red-500 mb-4 font-medium">⚠️ មិនទាន់ចូលទេ — សូមបិទ ហើយបើកម្តងទៀត</p>
        )}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-red-600 text-sm font-medium">{apiError}</p>
          </div>
        )}
        <input
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="ឈ្មោះអាជីវកម្ម"
          className="w-full p-4 border-2 border-gray-200 rounded-2xl mb-6 text-lg focus:border-blue-400 outline-none text-gray-900"
        />
        <p className="text-sm text-gray-800 mb-3 font-semibold">ប្រភេទអាជីវកម្ម</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {types.map(t => (
            <button
              key={t.value}
              onClick={() => setCompanyType(t.value)}
              className={`p-3 rounded-2xl text-center text-sm border-2 transition-all ${
                companyType === t.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-gray-200 text-gray-700 bg-white'
              }`}
            >
              <div className="text-2xl mb-1">{t.icon}</div>
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => createCompany.mutate()}
          disabled={!companyName.trim() || createCompany.isPending}
          className="w-full bg-blue-500 text-white py-4 rounded-2xl font-medium text-lg disabled:opacity-40 shadow active:bg-blue-600"
        >
          {createCompany.isPending ? 'កំពុងបង្កើត...' : 'បន្ត →'}
        </button>
      </div>
    )
  }

  // Step 2: Create first account
  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl font-bold text-blue-600">1°</span>
        <h2 className="text-xl font-bold text-gray-900">បន្ថែមគណនីដំបូង</h2>
      </div>
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-red-600 text-sm font-medium">{apiError}</p>
        </div>
      )}
      <p className="text-sm text-gray-800 mb-3 font-semibold">ប្រាក់របស់អ្នកនៅទីណា?</p>
      <input
        value={accountName}
        onChange={e => setAccountName(e.target.value)}
        placeholder="ឈ្មោះគណនី"
        className="w-full p-4 border-2 border-gray-200 rounded-2xl mb-2 text-lg focus:border-blue-400 outline-none text-gray-900"
      />
      <p className="text-xs text-gray-600 mb-8">ឧ. សាច់ប្រាក់ក្នុងដៃ, ABA Bank, Wing</p>
      <button
        onClick={() => {
          const cid = useAuth.getState().companyId
          if (cid) createAccount.mutate(cid)
        }}
        disabled={!accountName.trim() || createAccount.isPending}
        className="w-full bg-green-500 text-white py-4 rounded-2xl font-medium text-lg disabled:opacity-40 shadow active:bg-green-600"
      >
        {createAccount.isPending ? 'កំពុងរក្សាទុក...' : '✓ ចាប់ផ្តើមប្រើ'}
      </button>
    </div>
  )
}
