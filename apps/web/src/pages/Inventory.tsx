import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { haptic, tg } from '../lib/telegram'
import { ArrowLeft, Plus, ArrowDownToLine, ArrowUpFromLine, Trash2, AlertTriangle, Calculator, X } from 'lucide-react'

type InventoryItem = {
  id: string; name: string; name_km: string | null; unit: string
  current_qty: string; avg_cost_cents: string; low_stock_threshold: string
  created_at: string; updated_at: string
}

type Movement = {
  id: string; type: 'in' | 'out'; qty: string; cost_per_unit_cents: string
  note: string | null; occurred_at: string
}

type ItemDetail = InventoryItem & { movements: Movement[] }

const UNITS = ['kg', 'g', 'liter', 'piece', 'bag', 'box']
const KHR_RATE = 4100

function fmt(cents: number | string) {
  const n = typeof cents === 'string' ? parseInt(cents) : cents
  return `$${(n / 100).toFixed(2)}`
}

function fmtQty(q: string | number) {
  const n = typeof q === 'string' ? parseFloat(q) : q
  return n % 1 === 0 ? n.toString() : n.toFixed(2)
}

export default function Inventory() {
  const { companyId } = useAuth()
  const queryClient = useQueryClient()
  const safeTop = Math.max((tg as any).safeAreaInset?.top ?? 0, (tg as any).contentSafeAreaInset?.top ?? 0)

  const [view, setView] = useState<'list' | 'detail' | 'add'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showMovementForm, setShowMovementForm] = useState<'in' | 'out' | null>(null)
  const [showQuote, setShowQuote] = useState(false)

  // Add item form
  const [newName, setNewName] = useState('')
  const [newNameKm, setNewNameKm] = useState('')
  const [newUnit, setNewUnit] = useState('kg')
  const [newThreshold, setNewThreshold] = useState('')

  // Movement form
  const [mvQty, setMvQty] = useState('')
  const [mvCost, setMvCost] = useState('')
  const [mvNote, setMvNote] = useState('')

  // Quote
  const [quoteQty, setQuoteQty] = useState('')
  const [quoteMargin, setQuoteMargin] = useState('20')

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', companyId],
    queryFn: () => api.get(`/companies/${companyId}/inventory/items`).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: detail } = useQuery<ItemDetail>({
    queryKey: ['inventory-item', selectedId],
    queryFn: () => api.get(`/companies/${companyId}/inventory/items/${selectedId}`).then(r => r.data),
    enabled: !!selectedId && view === 'detail',
  })

  const totalValue = items.reduce((sum, i) => sum + parseFloat(i.current_qty) * parseInt(i.avg_cost_cents), 0)
  const lowStockCount = items.filter(i => parseFloat(i.current_qty) <= parseFloat(i.low_stock_threshold) && parseFloat(i.low_stock_threshold) > 0).length

  const createItem = useMutation({
    mutationFn: () => api.post(`/companies/${companyId}/inventory/items`, {
      name: newName, name_km: newNameKm || undefined, unit: newUnit,
      low_stock_threshold: newThreshold ? parseFloat(newThreshold) : 0,
    }),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setNewName(''); setNewNameKm(''); setNewUnit('kg'); setNewThreshold('')
      setView('list')
    },
    onError: () => haptic.error(),
  })

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${companyId}/inventory/items/${id}`),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setView('list'); setSelectedId(null)
    },
    onError: () => haptic.error(),
  })

  const addMovement = useMutation({
    mutationFn: (type: 'in' | 'out') => api.post(`/companies/${companyId}/inventory/items/${selectedId}/movements`, {
      type, qty: parseFloat(mvQty),
      cost_per_unit_cents: type === 'in' && mvCost ? Math.round(parseFloat(mvCost) * 100) : undefined,
      note: mvNote || undefined,
    }),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-item', selectedId] })
      setMvQty(''); setMvCost(''); setMvNote('')
      setShowMovementForm(null)
    },
    onError: () => haptic.error(),
  })

  const openDetail = (id: string) => { setSelectedId(id); setView('detail') }

  // Quote calculation
  const quoteUSD = detail && quoteQty ? (parseInt(detail.avg_cost_cents) / 100) * parseFloat(quoteQty) * (1 + parseFloat(quoteMargin || '0') / 100) : 0
  const quoteKHR = quoteUSD * KHR_RATE

  // --- ADD ITEM VIEW ---
  if (view === 'add') {
    return (
      <div className="min-h-screen bg-[#F8F7FF] pb-8 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
        <div className="flex items-center p-4">
          <button type="button" onClick={() => setView('list')} className="text-2xl mr-3 text-gray-500 active:opacity-60"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold text-gray-900">បន្ថែមទំនិញ</h1>
        </div>
        <div className="px-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">ឈ្មោះ (ខ្មែរ)</label>
              <input type="text" value={newNameKm} onChange={e => setNewNameKm(e.target.value)} placeholder="ស្រូវ, ម្រេច, ត្រី..."
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Name (English)</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Rice, Pepper, Fish..."
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">ឯកតា</label>
              <div className="flex gap-2 flex-wrap">
                {UNITS.map(u => (
                  <button key={u} type="button" onClick={() => setNewUnit(u)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      newUnit === u ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600'
                    }`}>{u}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">កម្រិតទាបបំផុត (ដាស់តឿន)</label>
              <input type="number" value={newThreshold} onChange={e => setNewThreshold(e.target.value)} placeholder="0"
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
            </div>
          </div>
          <button type="button" onClick={() => createItem.mutate()} disabled={!newName || createItem.isPending}
            className="w-full py-4 rounded-2xl font-semibold text-white bg-indigo-600 disabled:opacity-40 transition-all duration-200 active:scale-[0.98] shadow-sm">
            {createItem.isPending ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
          </button>
        </div>
      </div>
    )
  }

  // --- DETAIL VIEW ---
  if (view === 'detail' && detail) {
    const isLow = parseFloat(detail.current_qty) <= parseFloat(detail.low_stock_threshold) && parseFloat(detail.low_stock_threshold) > 0
    const stockValue = parseFloat(detail.current_qty) * parseInt(detail.avg_cost_cents)

    return (
      <div className="min-h-screen bg-[#F8F7FF] pb-24 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
        <div className="flex items-center p-4">
          <button type="button" onClick={() => { setView('list'); setSelectedId(null) }} className="text-2xl mr-3 text-gray-500 active:opacity-60"><ArrowLeft size={24} /></button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{detail.name_km || detail.name}</h1>
            {detail.name_km && <p className="text-sm text-gray-500">{detail.name}</p>}
          </div>
          {confirmDeleteId === detail.id ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { deleteItem.mutate(detail.id); setConfirmDeleteId(null) }}
                      className="bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold active:opacity-70">លុបពិតប្រាកដ</button>
                    <button type="button" onClick={() => setConfirmDeleteId(null)}
                      className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-xs active:opacity-70">បោះបង់</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDeleteId(detail.id)} className="text-rose-400 active:opacity-60 p-2"><Trash2 size={20} /></button>
                )}
        </div>

        <div className="px-4 space-y-4">
          {/* Stock summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500">ស្តុក</span>
              {isLow && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={12} /> ស្តុកទាប</span>}
            </div>
            <div className="text-3xl font-bold text-gray-900">{fmtQty(detail.current_qty)} <span className="text-lg text-gray-400">{detail.unit}</span></div>
            <div className="mt-2 flex gap-4 text-sm text-gray-500">
              <span>WAC: {fmt(detail.avg_cost_cents)}/{detail.unit}</span>
              <span>តម្លៃ: {fmt(stockValue)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowMovementForm('in'); setMvQty(''); setMvCost(''); setMvNote('') }}
              className="flex-1 py-3.5 rounded-2xl font-medium text-sm bg-emerald-600 text-white shadow-sm active:scale-[0.98] flex items-center justify-center gap-2">
              <ArrowDownToLine size={18} /> ស្តុកចូល
            </button>
            <button type="button" onClick={() => { setShowMovementForm('out'); setMvQty(''); setMvNote('') }}
              className="flex-1 py-3.5 rounded-2xl font-medium text-sm bg-rose-600 text-white shadow-sm active:scale-[0.98] flex items-center justify-center gap-2">
              <ArrowUpFromLine size={18} /> ស្តុកចេញ
            </button>
            <button type="button" onClick={() => { setShowQuote(!showQuote); setQuoteQty(''); setQuoteMargin('20') }}
              className="py-3.5 px-4 rounded-2xl font-medium text-sm bg-indigo-600 text-white shadow-sm active:scale-[0.98]">
              <Calculator size={18} />
            </button>
          </div>

          {/* Movement form */}
          {showMovementForm && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">{showMovementForm === 'in' ? 'ស្តុកចូល' : 'ស្តុកចេញ'}</h3>
                <button type="button" onClick={() => setShowMovementForm(null)} className="text-gray-400"><X size={20} /></button>
              </div>
              <input type="number" value={mvQty} onChange={e => setMvQty(e.target.value)} placeholder={`ចំនួន (${detail.unit})`}
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
              {showMovementForm === 'in' && (
                <input type="number" value={mvCost} onChange={e => setMvCost(e.target.value)} placeholder="តម្លៃក្នុង 1 ឯកតា ($)"
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
              )}
              <input type="text" value={mvNote} onChange={e => setMvNote(e.target.value)} placeholder="កំណត់ចំណាំ"
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
              <button type="button" onClick={() => addMovement.mutate(showMovementForm)}
                disabled={!mvQty || parseFloat(mvQty) <= 0 || addMovement.isPending}
                className={`w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-40 active:scale-[0.98] shadow-sm ${
                  showMovementForm === 'in' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                {addMovement.isPending ? 'កំពុងរក្សាទុក...' : 'បញ្ជាក់'}
              </button>
            </div>
          )}

          {/* Quote generator */}
          {showQuote && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">គណនាតម្លៃលក់</h3>
                <button type="button" onClick={() => setShowQuote(false)} className="text-gray-400"><X size={20} /></button>
              </div>
              <input type="number" value={quoteQty} onChange={e => setQuoteQty(e.target.value)} placeholder={`ចំនួនលក់ (${detail.unit})`}
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
              <div className="flex items-center gap-2">
                <input type="number" value={quoteMargin} onChange={e => setQuoteMargin(e.target.value)} placeholder="20"
                  className="w-20 p-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-center" />
                <span className="text-sm text-gray-500">% margin</span>
              </div>
              {quoteQty && parseFloat(quoteQty) > 0 && (
                <div className="bg-indigo-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-indigo-700">${quoteUSD.toFixed(2)}</div>
                  <div className="text-sm text-indigo-500 mt-1">៛ {Math.round(quoteKHR).toLocaleString()} KHR</div>
                  <div className="text-xs text-gray-400 mt-2">WAC: {fmt(detail.avg_cost_cents)} × {fmtQty(quoteQty)} × {(1 + parseFloat(quoteMargin || '0') / 100).toFixed(2)}</div>
                </div>
              )}
            </div>
          )}

          {/* Movement history */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">ប្រវត្តិចលនា</h3>
            {detail.movements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">មិនមានចលនាថ្មី</p>
            ) : (
              <div className="space-y-2">
                {detail.movements.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.type === 'in' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                        {m.type === 'in' ? <ArrowDownToLine size={14} className="text-emerald-600" /> : <ArrowUpFromLine size={14} className="text-rose-600" />}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{m.type === 'in' ? '+' : '-'}{fmtQty(m.qty)} {detail.unit}</span>
                        {m.note && <p className="text-xs text-gray-400">{m.note}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      {m.type === 'in' && parseInt(m.cost_per_unit_cents) > 0 && <span className="text-xs text-gray-400">{fmt(m.cost_per_unit_cents)}/{detail.unit}</span>}
                      <p className="text-xs text-gray-300">{new Date(m.occurred_at).toLocaleDateString('km-KH', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // --- LIST VIEW ---
  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-24 animate-fadeIn" style={{ paddingTop: `${safeTop}px` }}>
      <div className="flex items-center justify-between p-4">
        <h1 className="text-xl font-bold text-gray-900">ស្តុកទំនិញ</h1>
        <button type="button" onClick={() => setView('add')}
          className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm active:scale-[0.95]">
          <Plus size={20} />
        </button>
      </div>

      <div className="px-4 space-y-4">
        {/* Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">តម្លៃស្តុកសរុប</p>
            <p className="text-xl font-bold text-gray-900">{fmt(totalValue)}</p>
            <p className="text-xs text-gray-400">៛ {Math.round(totalValue / 100 * KHR_RATE).toLocaleString()}</p>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 px-3 rounded-xl">
              <AlertTriangle size={16} className="text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-amber-700">{lowStockCount}</p>
                <p className="text-[10px] text-amber-500">ស្តុកទាប</p>
              </div>
            </div>
          )}
        </div>

        {/* Items list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-sm h-20 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">មិនមានទំនិញនៅឡើយ</p>
            <button type="button" onClick={() => setView('add')} className="mt-3 text-indigo-600 text-sm font-medium">+ បន្ថែមទំនិញ</button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const isLow = parseFloat(item.current_qty) <= parseFloat(item.low_stock_threshold) && parseFloat(item.low_stock_threshold) > 0
              const value = parseFloat(item.current_qty) * parseInt(item.avg_cost_cents)
              return (
                <button key={item.id} type="button" onClick={() => openDetail(item.id)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 active:scale-[0.99] transition-all text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate">{item.name_km || item.name}</span>
                      {isLow && <span className="shrink-0 w-2 h-2 rounded-full bg-amber-400" />}
                    </div>
                    {item.name_km && <p className="text-xs text-gray-400 truncate">{item.name}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">{fmtQty(item.current_qty)} <span className="text-xs text-gray-400">{item.unit}</span></p>
                    <p className="text-xs text-gray-400">{fmt(value)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
