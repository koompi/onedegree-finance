import { useState } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Pill from '../components/Pill'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import { useInventory } from '../hooks/useInventory'
import { useAmount } from '../hooks/useAmount'
import { fmtKHR } from '../lib/format'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'
import { useI18nStore } from '../store/i18nStore'
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
  const t = useI18nStore(s => s.t)

  const { isLoading, items, totalValue, lowStockCount, create, remove, addMovement } = useInventory()
  const { fmt } = useAmount()


  const filtered = filter === 'low' ? items.filter(i => i.current_qty <= i.reorder_level)
    : filter === 'out' ? items.filter(i => i.current_qty === 0) : items

  const handleAdd = async () => {
    if (!itemName) return
    haptic('success')
    try {
      await create({ name: itemName, current_qty: qty, wac_cost: cost, reorder_level: reorder })
      toast.success(t('tx_saved_success'))
      setShowAdd(false); setItemName(''); setQty(0); setCost(0); setReorder(0)
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  const handleMove = async () => {
    if (moveQty <= 0) return
    haptic('success')
    try {
      await addMovement(stockItemId, { movement_type: moveType, quantity: moveQty })
      toast.success(t('tx_saved_success'))
      setShowStock(false); setMoveQty(0)
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    haptic('error')
    try {
      await remove(deleteId)
      toast.success(t('tx_deleted_success'))
      setDeleteId(null)
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  if (isLoading) return <div className="min-h-[100dvh] animate-fadeIn relative"><ScreenHeader title={t('nav_inventory')} onBack={onBack} /><div className="px-4 pt-3"><SkeletonLoader rows={4} /></div></div>

  return (
    <div className="h-screen flex flex-col animate-fadeIn overflow-hidden">
      <ScreenHeader title={t('nav_inventory')} onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-40">
        <div className="px-4 space-y-2 pt-2">
          <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-2.5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="text-[9px] font-semibold" style={{ color: 'var(--text-dim)' }}>{t('inventory_total_value')}</div>
            <div className="text-sm font-extrabold font-mono-num mt-0.5" style={{ color: 'var(--text)' }}>{fmt(totalValue)}</div>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="text-[9px] font-semibold" style={{ color: 'var(--text-dim)' }}>{t('inventory_items_count')}</div>
            <div className="text-sm font-extrabold font-mono-num mt-0.5" style={{ color: 'var(--text)' }}>{items.length}</div>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="text-[9px] font-semibold" style={{ color: 'var(--text-dim)' }}>{t('inventory_low_stock')}</div>
            <div className="text-sm font-extrabold font-mono-num mt-0.5" style={{ color: 'var(--orange)' }}>{lowStockCount}</div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          <Pill
            label={t('inventory_filter_all')}
            active={filter === 'all'}
            onClick={() => { haptic('light'); setFilter('all') }}
          />
          <Pill
            label={t('inventory_filter_low')}
            active={filter === 'low'}
            onClick={() => { haptic('light'); setFilter('low') }}
          />
          <Pill
            label={t('inventory_filter_out')}
            active={filter === 'out'}
            onClick={() => { haptic('light'); setFilter('out') }}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="📦" title={t('inventory_empty_title')} action={{ label: t('tx_add_new'), onClick: () => setShowAdd(true) }} />
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            {filtered.map((item, i) => {
              const isOut = item.current_qty === 0
              const isLow = !isOut && item.current_qty <= item.reorder_level
              const accentColor = isOut ? 'var(--red)' : isLow ? 'var(--orange)' : 'var(--gold)'
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 active:bg-white/5 transition-colors cursor-pointer"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onClick={() => { setStockItemId(item.id); setShowStock(true) }}
                >
                  {/* Status accent bar */}
                  <div className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: accentColor, minHeight: '28px' }} />
                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 leading-tight">
                      <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.name}</span>
                      {isLow && <span className="text-[9px] font-bold px-1 rounded" style={{ background: 'var(--orange-soft,#fff3e0)', color: 'var(--orange)' }}>{t('inventory_badge_low')}</span>}
                      {isOut && <span className="text-[9px] font-bold px-1 rounded" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>{t('inventory_badge_out')}</span>}
                    </div>
                    <div className="text-[10px] opacity-40 leading-tight mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      WAC {fmt(item.wac_cost)} · {fmt(item.current_qty * item.wac_cost)}
                    </div>
                  </div>
                  {/* Qty */}
                  <div className="text-right shrink-0">
                    <div className="text-[15px] font-black font-mono-num leading-tight" style={{ color: isOut ? 'var(--red)' : isLow ? 'var(--orange)' : 'var(--text)' }}>{item.current_qty}</div>
                    <div className="text-[9px] opacity-40 leading-tight" style={{ color: 'var(--text-dim)' }}>{item.unit || t('inventory_unit')}</div>
                  </div>
                  {/* Delete inline */}
                  {deleteId === item.id ? (
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={handleDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: 'var(--red)' }}>{t('tx_delete_confirm')}</button>
                      <button onClick={() => setDeleteId(null)} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>{t('tx_delete_cancel')}</button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteId(item.id) }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                      style={{ background: 'var(--red-soft)' }}
                    >
                      <Icon name="trash" size={11} color="var(--red)" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}        </div>      </div>

      <div className="fixed fab-bottom right-6 z-40">
        <button 
          onClick={() => { haptic('medium'); setShowAdd(true) }} 
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-gold transition-all active:scale-95 group"
          style={{ background: 'var(--gold)' }}
        >
          <Icon name="plus" size={28} color="#000000" />
        </button>
      </div>

      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title={t('inventory_form_name')}>
        <div className="space-y-4">
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('inventory_form_name')}</label><input value={itemName} onChange={e => setItemName(e.target.value)} placeholder={t('inventory_form_name')} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('inventory_form_qty')}</label><input type="number" inputMode="numeric" value={qty || ''} onChange={e => setQty(parseInt(e.target.value) || 0)} placeholder="0" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold font-mono-num outline-none text-right" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('inventory_form_cost')}</label><CurrencyInput value={cost} onChange={setCost} /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('inventory_form_reorder')}</label><input type="number" inputMode="numeric" value={reorder || ''} onChange={e => setReorder(parseInt(e.target.value) || 0)} placeholder="0" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold font-mono-num outline-none text-right" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <button onClick={handleAdd} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>{t('tx_form_save')}</button>
        </div>
      </BottomSheet>
      <BottomSheet isOpen={showStock} onClose={() => setShowStock(false)} title={t('inventory_move_title')}>
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              ['in', t('inventory_move_in')],
              ['out', t('inventory_move_out')],
              ['adjustment', t('inventory_move_adj')]
            ].map(([k, l]) => (
              <button key={k} onClick={() => setMoveType(k)} className="flex-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: moveType === k ? 'var(--gold)' : 'var(--border)', color: moveType === k ? 'var(--bg)' : 'var(--text-sec)' }}>{l}</button>
            ))}
          </div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_amount')}</label><input type="number" inputMode="numeric" value={moveQty || ''} onChange={e => setMoveQty(parseInt(e.target.value) || 0)} placeholder="0" className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold font-mono-num outline-none text-right" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <button onClick={handleMove} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98]" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>{t('inventory_move_send')}</button>
        </div>
      </BottomSheet>
    </div>
  )
}
