import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import CurrencyInput from '../components/CurrencyInput'
import { haptic, tg } from '../lib/telegram'

type Account = { id: string; name: string }
type Category = { id: string; name_km: string; name: string; icon: string; type: string }

export default function EditTransaction() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { companyId } = useAuth()
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amountCents, setAmountCents] = useState(0)
  const [currencyInput, setCurrencyInput] = useState<'USD' | 'KHR'>('USD')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [note, setNote] = useState('')
  const [loaded, setLoaded] = useState(false)
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)

  const { data: transaction } = useQuery({
    queryKey: ['transaction', companyId, id],
    queryFn: () => api.get(`/companies/${companyId}/transactions/${id}`).then(r => r.data),
    enabled: !!companyId && !!id,
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories', companyId],
    queryFn: () => api.get(`/companies/${companyId}/categories`).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['accounts', companyId],
    queryFn: () => api.get(`/companies/${companyId}/accounts`).then(r => r.data),
    enabled: !!companyId,
  })

  useEffect(() => {
    if (transaction && !loaded) {
      setType(transaction.type || 'expense')
      setAmountCents(transaction.amount_cents || 0)
      setCategoryId(transaction.category_id || '')
      setAccountId(transaction.account_id || '')
      setNote(transaction.note || '')
      setLoaded(true)
    }
  }, [transaction, loaded])

  const mutation = useMutation({
    mutationFn: () => api.patch(`/companies/${companyId}/transactions/${id}`, {
      account_id: accountId || undefined,
      category_id: categoryId || undefined,
      type,
      amount_cents: amountCents,
      currency_input: currencyInput,
      note: note || undefined,
    }),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
      navigate(-1)
    },
    onError: () => haptic.error(),
  })

  const filteredCategories = categories?.filter(c => c.type === type) || []

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-8 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
      <div className="flex items-center p-4">
        <button type="button" onClick={() => navigate(-1)} className="text-2xl mr-3 text-gray-500 active:opacity-60">&larr;</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">កែប្រែប្រតិបត្តិការ</h1>
      </div>

      <div className="px-4 space-y-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => { setType('income'); setCategoryId('') }}
            className={`flex-1 py-3 rounded-2xl font-medium text-sm transition-all duration-200 ${
              type === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-500 shadow-sm'
            }`}>+ ចំណូល</button>
          <button type="button" onClick={() => { setType('expense'); setCategoryId('') }}
            className={`flex-1 py-3 rounded-2xl font-medium text-sm transition-all duration-200 ${
              type === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-gray-500 shadow-sm'
            }`}>- ចំណាយ</button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <CurrencyInput onChange={(cents, cur) => { setAmountCents(cents); setCurrencyInput(cur) }} initialCents={transaction?.amount_cents} />
        </div>

        {filteredCategories.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-3">ប្រភេទ</p>
            <div className="grid grid-cols-4 gap-2">
              {filteredCategories.map(c => (
                <button key={c.id} type="button" onClick={() => setCategoryId(c.id === categoryId ? '' : c.id)}
                  className={`p-3 rounded-2xl text-center border-2 transition-all duration-200 ${
                    categoryId === c.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-gray-50'
                  }`}>
                  <div className="text-2xl">{c.icon}</div>
                  <div className="text-[11px] mt-1 truncate text-gray-600">{c.name_km || c.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {accounts && accounts.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-3">គណនី</p>
            <div className="flex gap-2 flex-wrap">
              {accounts.map(a => (
                <button key={a.id} type="button" onClick={() => setAccountId(a.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    accountId === a.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600'
                  }`}>{a.name}</button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="កំណត់ចំណាំ (ស្រេចចិត្ត)" autoComplete="off" autoCorrect="off"
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-gray-900 placeholder-gray-400 text-sm" />
        </div>

        <button type="button" onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={`w-full py-4 rounded-2xl font-semibold text-white disabled:opacity-40 transition-all duration-200 active:scale-[0.98] shadow-sm ${
            type === 'income' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
          {mutation.isPending ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
        </button>
      </div>
    </div>
  )
}
