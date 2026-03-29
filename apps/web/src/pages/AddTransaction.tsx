import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import CurrencyInput from '../components/CurrencyInput'
import { haptic, tg } from '../lib/telegram'

const KHR_RATE = 4100
type Account = { id: string; name: string }
type Category = { id: string; name_km: string; name: string; icon: string; type: string }

function getDateOptions() {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  return { today: today.toISOString().slice(0, 10), yesterday: yesterday.toISOString().slice(0, 10) }
}

export default function AddTransaction() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { companyId } = useAuth()
  const [type, setType] = useState<'income' | 'expense'>(
    searchParams.get('type') as 'income' | 'expense' || 'expense'
  )
  const [amountCents, setAmountCents] = useState(0)
  const [currencyInput, setCurrencyInput] = useState<'USD' | 'KHR'>('USD')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [note, setNote] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'custom'>('today')
  const [customDate, setCustomDate] = useState(getDateOptions().today)
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)
  const dates = getDateOptions()
  const occurredAt = dateMode === 'today' ? dates.today : dateMode === 'yesterday' ? dates.yesterday : customDate

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
    if (accounts?.length && !accountId) setAccountId(accounts[0].id)
  }, [accounts])

  const mutation = useMutation({
    mutationFn: () => api.post(`/companies/${companyId}/transactions`, {
      account_id: accountId || undefined,
      category_id: categoryId || undefined,
      type,
      amount_cents: amountCents,
      currency_input: currencyInput,
      note: note || undefined,
      occurred_at: new Date(occurredAt + 'T12:00:00').toISOString(),
    }),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['report'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['today-tx'] })
      setShowSuccess(true)
    },
    onError: () => haptic.error(),
  })

  const resetForm = () => {
    setAmountCents(0); setCurrencyInput('USD')
    setCategoryId(''); setNote(''); setDateMode('today')
  }

  const filteredCategories = categories?.filter(c => c.type === type) || []
  const khrEquiv = currencyInput === 'USD' ? Math.round(amountCents / 100 * KHR_RATE) : 0

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-40 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
      <div className="flex items-center p-4">
        <button type="button" onClick={() => navigate(-1)} className="text-2xl mr-3 text-gray-500 active:opacity-60">&larr;</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          {type === 'income' ? '+ ចំណូល' : '- ចំណាយ'}
        </h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Amount */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <CurrencyInput onChange={(cents, cur) => { setAmountCents(cents); setCurrencyInput(cur) }} />
          {amountCents > 0 && currencyInput === 'USD' && (
            <p className="text-center text-xs text-gray-400 mt-2">≈ {khrEquiv.toLocaleString()} ៛</p>
          )}
        </div>

        {/* Date */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-2">កាលបរិច្ឆេទ</p>
          <div className="flex gap-2">
            {(['today', 'yesterday', 'custom'] as const).map(d => (
              <button key={d} type="button" onClick={() => setDateMode(d)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                  dateMode === d ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500'
                }`}>
                {d === 'today' ? 'ថ្ងៃនេះ' : d === 'yesterday' ? 'ម្សិលមិញ' : 'ផ្សេង'}
              </button>
            ))}
          </div>
          {dateMode === 'custom' && (
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
              className="mt-3 w-full p-3 rounded-xl border border-gray-200 outline-none text-sm focus:border-indigo-400" />
          )}
        </div>

        {/* Categories */}
        {filteredCategories.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 mb-3">ប្រភេទ</p>
            <div className="grid grid-cols-4 gap-2">
              {filteredCategories.map(c => (
                <button key={c.id} type="button" onClick={() => setCategoryId(c.id === categoryId ? '' : c.id)}
                  className={`p-2.5 rounded-xl text-center border-2 transition-all ${
                    categoryId === c.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-gray-50'
                  }`}>
                  <div className="text-xl">{c.icon}</div>
                  <div className="text-[10px] mt-0.5 truncate text-gray-600">{c.name_km || c.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Accounts */}
        {accounts && accounts.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 mb-2">គណនី</p>
            <div className="flex gap-2 flex-wrap">
              {accounts.map(a => (
                <button key={a.id} type="button" onClick={() => setAccountId(a.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    accountId === a.id ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'
                  }`}>{a.name}</button>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="កំណត់ចំណាំ (ស្រេចចិត្ត)" autoComplete="off" autoCorrect="off"
            className="w-full p-3 rounded-xl border border-gray-200 outline-none text-gray-900 placeholder-gray-400 text-sm focus:border-indigo-400" />
        </div>
      </div>

      {/* Bottom bar — income/expense toggle + save */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 space-y-3 z-30">
        <div className="flex gap-2">
          <button type="button" onClick={() => { haptic.light(); setType('income'); setCategoryId('') }}
            className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-all ${
              type === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-600'
            }`}>+ ចំណូល</button>
          <button type="button" onClick={() => { haptic.light(); setType('expense'); setCategoryId('') }}
            className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-all ${
              type === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-600'
            }`}>- ចំណាយ</button>
        </div>
        <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className={`w-full py-4 rounded-2xl font-bold text-white disabled:opacity-40 transition-all ${
            type === 'income' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
          {mutation.isPending ? 'កំពុងរក្សាទុក...' : !amountCents ? 'បញ្ចូលចំនួនទឹកប្រាក់' : 'រក្សាទុក'}
        </button>
      </div>

      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 mx-6 text-center shadow-lg space-y-4">
            <div className="text-5xl">✓</div>
            <p className="font-bold text-gray-900">រក្សាទុកបានសម្រេច!</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { resetForm(); setShowSuccess(false) }}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-indigo-600 text-white">
                បន្ថែមទៀត
              </button>
              <button type="button" onClick={() => navigate('/')}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700">
                ត្រឡប់ក្រោយ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
