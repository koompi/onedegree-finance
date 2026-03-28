import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../store/auth'
import { tg } from '../lib/telegram'
import { api } from '../lib/api'

export default function Onboarding() {
  const { login, setCompany } = useAuth()
  const [step, setStep] = useState(0)
  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState('general')
  const [accountName, setAccountName] = useState('សាច់ប្រាក់ក្នុងដៃ')
  const [loading, setLoading] = useState(false)

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

  const handleTelegramLogin = async () => {
    setLoading(true)
    try {
      await login(tg.initData)
      setStep(1)
    } catch {
      alert('Login failed')
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">1°</div>
        <h1 className="text-2xl font-bold mb-2">OneDegree Finance</h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed max-w-xs">
          តាមដានចំណូល ចំណាយ និងប្រាក់ចំណេញ<br/>សម្រាប់អាជីវកម្មខ្នាតតូច
        </p>
        <button
          onClick={handleTelegramLogin}
          disabled={loading}
          className="w-full max-w-xs bg-blue-500 text-white py-3 rounded-xl font-medium text-lg disabled:opacity-50"
        >
          {loading ? 'កំពុងចូល...' : 'ចាប់ផ្តើម'}
        </button>
        <p className="text-xs text-gray-400 mt-6 max-w-xs">
          ទិន្នន័យរបស់អ្នកមានសុវត្ថិភាព។ យើងមិនចែករំលែកជាមួយស្ថាប័នពន្ធដារទេ។
        </p>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="min-h-screen p-6">
        <h2 className="text-xl font-bold mb-6">បង្កើតអាជីវកម្មរបស់អ្នក</h2>
        <input
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="ឈ្មោះអាជីវកម្ម"
          className="w-full p-3 border border-gray-200 rounded-xl mb-4 text-lg"
        />
        <p className="text-sm text-gray-500 mb-3">ប្រភេទអាជីវកម្ម</p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {types.map(t => (
            <button
              key={t.value}
              onClick={() => setCompanyType(t.value)}
              className={`p-3 rounded-xl text-center text-sm border-2 ${
                companyType === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
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
          className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {createCompany.isPending ? 'កំពុងបង្កើត...' : 'បន្ត'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <h2 className="text-xl font-bold mb-6">បន្ថែមគណនីដំបូង</h2>
      <input
        value={accountName}
        onChange={e => setAccountName(e.target.value)}
        placeholder="ឈ្មោះគណនី"
        className="w-full p-3 border border-gray-200 rounded-xl mb-4 text-lg"
      />
      <p className="text-xs text-gray-400 mb-6">ឧ. សាច់ប្រាក់ក្នុងដៃ, ABA Bank, Wing</p>
      <button
        onClick={() => {
          const cid = useAuth.getState().companyId
          if (cid) createAccount.mutate(cid)
        }}
        disabled={!accountName || createAccount.isPending}
        className="w-full bg-green-500 text-white py-3 rounded-xl font-medium disabled:opacity-50"
      >
        {createAccount.isPending ? 'កំពុងរក្សាទុក...' : 'ចាប់ផ្តើមប្រើ'}
      </button>
    </div>
  )
}
