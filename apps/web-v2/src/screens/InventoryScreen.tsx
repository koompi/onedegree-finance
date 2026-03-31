import { useState } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Pill from '../components/Pill'
import Badge from '../components/Badge'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import { useInventory } from '../hooks/useInventory'
import { fmtKHR } from '../lib/format'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'
import CurrencyInput from '../components/CurrencyInput'

const FILTERS = [{ key: 'all', label: 'ទាំងអស់' }, { key: 'low', label: 'ស្តុកតិច' }, { key: 'out', label: 'អស់ស្តុក' }]

export default function InventoryScreen({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showStock, setShowStock] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [itemName, setItemName] = useState('')
  const [qty, setQty] = useState(0)
  const [cost, setCost] = useState(0)
  const [reorder, setReorder] = useState(0)
  const [stockItemId, setStockItemId] = useState('')
  const [moveType, setMoveType] = useState('in')
  const [moveQty, setMoveQty] = useState(0)

  const { isLoading, items, totalValue, lowStockCount, create, remove, addMovement } = useInventory()


  const filtered = filter === 'low' ? items.filter(i => i.current_qty <= i.reorder_level)
    : filter === 'out' ? items.filter(i => i.current_qty === 0) : items

  const handleAdd = async () => {
    if (!itemName) return
    haptic('success')
    await create({ name: itemName, current_qty: qty, wac_cost: cost, reorder_level: reorder })
    toast.success('បន្ថែមទំនិញដោយជោគជ័យ')
    setShowAdd(false); setItemName(''); setQty(0); setCost(0); setReorder(0)
  }

  const handleMove = async () => {
    if (moveQty <= 0) return
    haptic('success')
    await addMovement(stockItemId, { movement_type: moveType, quantity: moveQty })
    toast.success('ចលនាស្តុកដោយជោគជ័យ')
    setShowStock(false); setMoveQty(0)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    haptic('error')
    await remove(deleteId)
    toast.success('លុបដោយជោគជ័យ')
    setDeleteId(null)
  }

  if (isLoading) return <div className="min-h-screen animate-fadeIn"><ScreenHeader title="ស្តុកទំនិញ" onBack={onBack} /><div className="px-4 pt-3"><SkeletonLoader rows={4} /></div></div>

  return (
    <div className="min-h-screen animate-fadeIn pb-4">
      <ScreenHeader title="ស្តុកទំនិញ" onBack={onBack} />
      <div className="px-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="text-[10px] font-semibold" style={{ color: 'var(--text-dim)' }}>តម្លៃសរុប</div>
            <div className="text-sm font-extrabold font-mono-num mt-0.5" style={{ color: 'var(--text)' }}>{fmtKHR(totalValue)}</div>
          </div>
          <div className="rounded-2xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="text-[10px] font-semibold" style={{ color: 'var(--text-dim)' }}>ទំនិញ</div>
            <div className="text-sm font-extrabold font-mono-num mt-0.5" style={{ color: 'var(--text)' }}>{items.length}</div>
          </div>
          <div className="rounded-2xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="text-[10px] font-semibold" style={{ color: 'var(--text-dim)' }}>ស្តុកតិច</div>
            <div className="text-sm font-extrabold font-mono-num mt-0.5" style={{ color: 'var(--orange)' }}>{lowStockCount}</div>
          </div>
        </div>
        <div className="flex gap-2">{FILTERS.map(f => <Pill key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />)}</div>
        {filtered.length === 0 ? (
          <EmptyState icon="📦" title="មិនទាន់មានទំនិញ" action={{ label: '+ ថ្មី', onClick: () => setShowAdd(true) }} />
        ) : filtered.map(item => (
          <div key={item.id} className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gold-soft)' }}>
                <Icon name="package" size={16} color="var(--gold)" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.name}</span>
                  {item.current_qty <= item.reorder_level && item.current_qty > 0 && <Badge variant="warning">ស្តុកតិច</Badge>}
                  {item.current_qty === 0 && <Badge variant="error">អស់ស្តុក</Badge>}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>WAC: {fmtKHR(item.wac_cost)} / {item.unit || 'ឯកការា'}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono-num" style={{ color: 'var(--text)' }}>{item.current_qty}</div>
                <div className="text-[10px] font-mono-num" style={{ color: 'var(--text-dim)' }}>{fmtKHR(item.current_qty * item.wac_cost)}</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setStockItemId(item.id); setShowStock(true) }} className="flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>
                <Icon name="refresh" size={12} /> ចលនា
              </button>
              {deleteId === item.id ? (
                <div className="flex gap-1">
                  <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: 'var(--red)' }}>លុប</button>
                  <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>បោះបង់</button>
                </div>
              ) : (
                <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'var(--red-soft)' }}>
                  <Icon name="trash" size={12} color="var(--red)" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90" style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(232,184,75,0.3)' }}>
          <Icon name="plus" size={22} color="var(--bg)" />
        </button>
      </div>
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="ទំនិញថ្មី">
        <div className="space-y-4">
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ឈ្មោះទំនិញ</label><input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="ឈ្មោះទំនិញ" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ចំនួនស្តុកចូល</label><input type="number" inputMode="numeric" value={qty || ''} onChange={e => setQty(parseInt(e.target.value) || 0)} placeholder="0" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold font-mono-num outline-none text-right" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>តម្លៃរាយ/ឯកការា</label><CurrencyInput value={cost} onChange={setCost} /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>កម្រិតស្តុកទាបបំផុត</label><input type="number" inputMode="numeric" value={reorder || ''} onChange={e => setReorder(parseInt(e.target.value) || 0)} placeholder="0" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold font-mono-num outline-none text-right" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <button onClick={handleAdd} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>រក្សាទុក</button>
        </div>
      </BottomSheet>
      <BottomSheet isOpen={showStock} onClose={() => setShowStock(false)} title="ចលនាស្តុក">
        <div className="space-y-4">
          <div className="flex gap-2">
            {[['in', 'ចូលស្តុក'], ['out', 'ចេញស្តុក'], ['adjustment', 'កែតម្រូវ']].map(([k, l]) => (
              <button key={k} onClick={() => setMoveType(k)} className="flex-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: moveType === k ? 'var(--gold)' : 'var(--border)', color: moveType === k ? 'var(--bg)' : 'var(--text-sec)' }}>{l}</button>
            ))}
          </div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>ចំនួន</label><input type="number" inputMode="numeric" value={moveQty || ''} onChange={e => setMoveQty(parseInt(e.target.value) || 0)} placeholder="0" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold font-mono-num outline-none text-right" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <button onClick={handleMove} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>បញ្ជូន</button>
        </div>
      </BottomSheet>
    </div>
  )
}
