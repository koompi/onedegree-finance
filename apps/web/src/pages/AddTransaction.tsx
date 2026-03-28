import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import CurrencyInput from '../components/CurrencyInput'
import { haptic } from '../lib/telegram'

export default function AddTransaction() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { companyId } = useAuth()
  const [type, setType] = useState<'income' | 'expense'>(searchParams.get('type') as 'income' | 'expense' || 'expense')
  const [amountCents, setAmountCents] = useState(0)
  const [currencyInput, setCurrencyInput] = useState<'USD' | 'KHR'>('USD')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [note, setNote] = useState('')

  const { data: categories } = useQuery({
    queryKey: ['categories', companyId],
    queryFn: () => api.get(`/companies/${companyId}/categories`).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts', companyId],
    queryFn: () => api.get(`/companies/${companyId}/accounts`).then(r => r.data),
    enabled: !!companyId,
  })

  const mutation = useMutation({
    mutationFn: () => api.post(`/companies/${companyId}/transactions`, {
      account_id: accountId,
      category_id: categoryId || undefined,
      type,
      amount_cents: amountCents,
      currency_input: currencyInput,
      note: note || undefined,
      occurred_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['report'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      navigate('/')
    },
    onError: () => haptic.error(),
  })

  const filteredCategories = categories?.filter((c: { type: string }) => c.type === type) || []

  return (
    <div className="min-h-screen p-4">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="text-2xl mr-3">&larr;</button>
        <h1 className="text-xl font-bold">{type === 'income' ? 'ចំណូល' : 'ចំណាយ'}</h1>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setType('income')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm ${type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
        >ចំណូល</button>
        <button
          onClick={() => setType('expense')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
        >ចំណាយ</button>
      </div>

      <div className="mb-6">
        <CurrencyInput value={amountCents} onChange={(cents, cur) => { setAmountCents(cents); setCurrencyInput(cur) }} />
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">ប្រភេទ</p>
        <div className="grid grid-cols-4 gap-2">
          {filteredCategories.map((c: { id: string; name_km: string; name: string; icon: string }) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`p-2 rounded-xl text-center text-xs border-2 ${
                categoryId === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
              }`}
            >
              <div className="text-xl">{c.icon}</div>
              <div className="truncate">{c.name_km || c.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">គណនី</p>
        <div className="flex gap-2 flex-wrap">
          {accounts?.map((a: { id: string; name: string }) => (
            <button
              key={a.id}
              onClick={() => setAccountId(a.id)}
              className={`px-4 py-2 rounded-xl text-sm border-2 ${
                accountId === a.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
              }`}
            >{a.name}</button>
          ))}
        </div>
      </div>

      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="កំណត់ចំណាំ (ស្រេចចិត្ត)"
        className="w-full p-3 border border-gray-200 rounded-xl mb-6"
      />

      <button
        onClick={() => mutation.mutate()}
        disabled={!amountCents || !accountId || mutation.isPending}
        className={`w-full py-3 rounded-xl font-medium text-white disabled:opacity-50 ${
          type === 'income' ? 'bg-green-500' : 'bg-red-500'
        }`}
      >
        {mutation.isPending ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
      </button>
    </div>
  )
}
