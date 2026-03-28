import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../store/auth'
import { tg } from '../lib/telegram'
import { api } from '../lib/api'

// Dev mode: if not inside Telegram, use mock initData
const IS_TELEGRAM = Boolean(tg.initData && tg.initData.length > 0)

export default function Onboarding() {
  const { login, setCompany } = useAuth()
  const [step, setStep] = useState(IS_TELEGRAM ? 1 : 0) // Skip welcome screen in Telegram
  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState('general')
  const [accountName, setAccountName] = useState('សាច់ប្រាក់ក្នុងដៃ')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const createCompany = useMutation({
    mutationFn: async () => {
      const res = await api.post('/companies', { name: companyName, type: companyType })
      return res.data
    },
    onSuccess: (data) => {
      setCompany(data.id)
      setStep(2)
    },
  })

  const createAccount = useMutation({
    mutationFn: async (companyId: string) => {
      const res = await api.post(`/companies/${companyId}/accounts`, { name: accountName, type: 'cash' })
      return res.data
    },
    onSuccess: () => {
      window.location.href = '/'
    },
  })

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      if (IS_TELEGRAM) {
        await login(tg.initData)
      } else {
        // Browser/dev mode — use demo login
        await login('dev_mode')
      }
      setStep(1)
    } catch (e) {
      setError('ចូលមិនបានទេ — សូមព្យាយាមម្តងទៀត')
    } finally {
      setLoading(false)
    }
  }

  const types = [
    { value: 'agro', label: 'កសិកម្ម', icon: '🌾' },
    { value: 'general', label: 'ទូទៅ', icon: '🏪' },
    { value: 'retail', label: 'លក់រាយ', icon: '🛒' },
    { value: 'service', label: 'សេវាកម្ម', icon: '🔧' },
    { value: 'other', label: 'ផ្សេងៗ', icon: '📦' },
  ]

  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <div className="text-7xl mb-2 font-bold text-blue-600">1°</div>
        <h1 className="text-2xl font-bold mb-1">OneDegree Finance</h1>
        <p className="text-gray-500 text-xs mb-8">by KOOMPI</p>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed max-w-xs">
          តាមដានចំណូល ចំណាយ និងប្រាក់ចំណេញ<br/>សម្រាប់អាជីវកម្មខ្នាតតូច និងមធ្យម
        </p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full max-w-xs bg-blue-500 text-white py-4 rounded-2xl font-medium text-lg disabled:opacity-50 shadow-lg"
        >
          {loading ? 'កំពុងចូល...' : '▶ Preview Demo'}
        </button>
        <p className="text-xs text-amber-500 mt-4 max-w-xs">
          ⚠️ Browser preview mode — open via Telegram for full experience
        </p>
        <p className="text-xs text-gray-500 mt-6 max-w-xs leading-relaxed">
          ទិន្នន័យរបស់អ្នកមានសុវត្ថិភាព។<br/>យើងមិនចែករំលែកជាមួយស្ថាប័នពន្ធដារទេ។
        </p>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="min-h-screen p-6 bg-white">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl font-bold text-blue-600">1°</span>
          <h2 className="text-xl font-bold">បង្កើតអាជីវកម្មរបស់អ្នក</h2>
        </div>
        <input
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="ឈ្មោះអាជីវកម្ម"
          className="w-full p-4 border-2 border-gray-200 rounded-2xl mb-6 text-lg focus:border-blue-400 outline-none"
        />
        <p className="text-sm text-gray-700 mb-3 font-semibold">ប្រភេទអាជីវកម្ម</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {types.map(t => (
            <button
              key={t.value}
              onClick={() => setCompanyType(t.value)}
              className={`p-3 rounded-2xl text-center text-sm border-2 transition-all ${
                companyType === t.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              <div className="text-2xl mb-1">{t.icon}</div>
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => createCompany.mutate()}
          disabled={!companyName || createCompany.isPending}
          className="w-full bg-blue-500 text-white py-4 rounded-2xl font-medium text-lg disabled:opacity-50 shadow"
        >
          {createCompany.isPending ? 'កំពុងបង្កើត...' : 'បន្ត →'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl font-bold text-blue-600">1°</span>
        <h2 className="text-xl font-bold">បន្ថែមគណនីដំបូង</h2>
      </div>
      <p className="text-sm text-gray-700 mb-3">ប្រាក់របស់អ្នកនៅទីណា?</p>
      <input
        value={accountName}
        onChange={e => setAccountName(e.target.value)}
        placeholder="ឈ្មោះគណនី"
        className="w-full p-4 border-2 border-gray-200 rounded-2xl mb-2 text-lg focus:border-blue-400 outline-none"
      />
      <p className="text-xs text-gray-500 mb-8">ឧ. សាច់ប្រាក់ក្នុងដៃ, ABA Bank, Wing</p>
      <button
        onClick={() => {
          const cid = useAuth.getState().companyId
          if (cid) createAccount.mutate(cid)
        }}
        disabled={!accountName || createAccount.isPending}
        className="w-full bg-green-500 text-white py-4 rounded-2xl font-medium text-lg disabled:opacity-50 shadow"
      >
        {createAccount.isPending ? 'កំពុងរក្សាទុក...' : '✓ ចាប់ផ្តើមប្រើ'}
      </button>
    </div>
  )
}
