import { useState } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import CurrencyInput from '../components/CurrencyInput'
import Toggle from '../components/Toggle'
import { useRecurring } from '../hooks/useRecurring'
import { useCategories } from '../hooks/useCategories'
import { useAccounts } from '../hooks/useAccounts'
import { useAmount } from '../hooks/useAmount'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'

const FREQ_LABELS: Record<string, string> = {
  daily:   '📅 ប្រចាំថ្ងៃ',
  weekly:  '📆 ប្រចាំសប្ដាហ៍',
  monthly: '🗓️ ប្រចាំខែ',
  yearly:  '📊 ប្រចាំឆ្នាំ',
}

const FREQ_SHORT: Record<string, string> = {
  daily: 'ថ្ងៃ', weekly: 'សប្ដាហ៍', monthly: 'ខែ', yearly: 'ឆ្នាំ',
}

export default function RecurringScreen({ onBack }: { onBack: () => void }) {
  const { isLoading, rules, create, toggle, remove, runNow } = useRecurring()
  const { incomeCategories, expenseCategories } = useCategories()
  const { accounts } = useAccounts()
  const { fmt } = useAmount()

  const [showAdd, setShowAdd]         = useState(false)
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [runningId, setRunningId]     = useState<string | null>(null)

  // Form state
  const [type, setType]               = useState<'income' | 'expense'>('expense')
  const [amount, setAmount]           = useState(0)
  const [categoryId, setCategoryId]   = useState('')
  const [accountId, setAccountId]     = useState('')
  const [note, setNote]               = useState('')
  const [frequency, setFrequency]     = useState<'daily'|'weekly'|'monthly'|'yearly'>('monthly')
  const [startDate, setStartDate]     = useState(new Date().toISOString().slice(0, 10))

  const filteredCategories = type === 'income' ? incomeCategories : expenseCategories

  const handleSave = async () => {
    if (amount <= 0) { toast.error('Amount > 0'); return }
    haptic('success')
    try {
      await create({
        type, amount_cents: amount, currency_input: 'KHR',
        category_id: categoryId || undefined,
        account_id:  accountId  || undefined,
        note:        note        || undefined,
        frequency,
        start_date:  startDate,
      })
      toast.success('Recurring rule saved')
      setShowAdd(false)
      setAmount(0); setCategoryId(''); setAccountId(''); setNote('')
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  const handleRunNow = async (id: string) => {
    setRunningId(id)
    haptic('medium')
    try {
      const res = await runNow(id)
      toast.success(`✅ Done — next: ${res.next_run_date}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    }
    setRunningId(null)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    haptic('error')
    try {
      await remove(deleteId)
      toast.success('Deleted')
      setDeleteId(null)
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  if (isLoading) return (
    <div className="min-h-[100dvh] animate-fadeIn">
      <ScreenHeader title="ប្រតិបត្តិការដដែលៗ" onBack={onBack} />
      <div className="px-4 pt-3"><SkeletonLoader rows={4} /></div>
    </div>
  )

  return (
    <div className="min-h-[100dvh] animate-fadeIn relative">
      <ScreenHeader
        title="ប្រតិបត្តិការដដែលៗ"
        onBack={onBack}
        right={
          <button
            onClick={() => { haptic('medium'); setShowAdd(true) }}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90"
            style={{ background: 'var(--gold)' }}
          >
            <Icon name="plus" size={18} color="#000" />
          </button>
        }
      />

      <div className="px-4 space-y-3 pb-10">
        {rules.length === 0 ? (
          <div className="py-20">
            <EmptyState
              icon="🔁"
              title="មិនទាន់មានកាលវិភាគ"
              subtitle="ចុច + ដើម្បីបន្ថែមប្រតិបត្តិការដដែលៗ"
              action={{ label: '+ បន្ថែម', onClick: () => setShowAdd(true) }}
            />
          </div>
        ) : rules.map(rule => (
          <div key={rule.id} className="rounded-2xl p-4" style={{ background: 'var(--card)', border: `1px solid ${rule.active ? 'var(--border)' : 'var(--border)'}`, opacity: rule.active ? 1 : 0.55 }}>
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ background: rule.type === 'income' ? 'var(--green-soft)' : 'var(--red-soft)' }}>
                {rule.category_icon || (rule.type === 'income' ? '💰' : '💸')}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold truncate" style={{ color: 'var(--text)' }}>
                    {rule.category_name || rule.note || (rule.type === 'income' ? 'ចំណូល' : 'ចំណាយ')}
                  </span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: rule.type === 'income' ? 'var(--green-soft)' : 'var(--red-soft)', color: rule.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                    {FREQ_SHORT[rule.frequency]}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black font-mono-num" style={{ color: rule.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                    {rule.type === 'income' ? '+' : '-'}{fmt(rule.amount_cents)}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                    {rule.account_name || ''}
                  </span>
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>
                  🗓 {rule.next_run_date}{rule.last_run_date ? ` · Last: ${rule.last_run_date}` : ''}
                </div>
              </div>

              {/* Toggle active */}
              <Toggle on={rule.active} onToggle={() => toggle(rule.id, !rule.active)} />
            </div>

            {/* Action row */}
            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => handleRunNow(rule.id)}
                disabled={runningId === rule.id}
                className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--gold-soft)', color: 'var(--gold)', border: '1px solid var(--gold-med)' }}
              >
                {runningId === rule.id ? '⏳' : '▶'} Run&nbsp;Now
              </button>

              {deleteId === rule.id ? (
                <div className="flex gap-1.5 flex-1">
                  <button onClick={handleDelete} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--red)', color: 'white' }}>លុប</button>
                  <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>បោះបង់</button>
                </div>
              ) : (
                <button
                  onClick={() => { haptic('medium'); setDeleteId(rule.id) }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90"
                  style={{ background: 'var(--red-soft)' }}
                >
                  <Icon name="trash" size={15} color="var(--red)" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Add form BottomSheet ─── */}
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="បន្ថែមកាលវិភាគ">
        <div className="space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            {(['income', 'expense'] as const).map(v => (
              <button key={v} onClick={() => setType(v)} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: type === v ? 'var(--gold)' : 'var(--border)', color: type === v ? 'var(--bg)' : 'var(--text-sec)' }}>
                {v === 'income' ? '💚 ចំណូល' : '❤️ ចំណាយ'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ចំនួនទឹកប្រាក់</label>
            <CurrencyInput value={amount} onChange={setAmount} autoFocus />
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ភាពញឹកញាប់</label>
            <div className="grid grid-cols-2 gap-2">
              {(['daily','weekly','monthly','yearly'] as const).map(f => (
                <button key={f} onClick={() => setFrequency(f)}
                  className="py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: frequency === f ? 'var(--gold)' : 'var(--border)', color: frequency === f ? 'var(--bg)' : 'var(--text-sec)' }}>
                  {FREQ_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Start date */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ថ្ងៃចាប់ផ្ដើម</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ប្រភេទ (ស្រេចចិត្ត)</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <option value="">-- មិនជ្រើស --</option>
              {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Account */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>គណនី (ស្រេចចិត្ត)</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <option value="">-- មិនជ្រើស --</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>កំណត់ចំណាំ</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="ឧ. ថ្លៃជួលអគារ..."
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>

          <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]"
            style={{ background: 'var(--gold)', color: 'var(--bg)' }}>
            រក្សាទុក
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
