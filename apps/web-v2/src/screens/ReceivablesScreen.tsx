import { useState, useRef } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Pill from '../components/Pill'
import Badge from '../components/Badge'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import CurrencyInput from '../components/CurrencyInput'
import { useReceivables, Receivable } from '../hooks/useReceivables'
import { useReceiptUpload } from '../hooks/useReceiptUpload'
import { useAmount } from '../hooks/useAmount'
import { fmtKHR, fmtDateKhmer, daysUntilDue, overdueBadgeText } from '../lib/format'
import { useI18nStore } from '../store/i18nStore'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'
import { getTelegram } from '../lib/telegram'

const SORTS = (t: any) => [
  { key: 'all', label: t('sort_all') },
  { key: 'overdue', label: t('sort_overdue') },
  { key: 'active', label: t('sort_active') },
  { key: 'paid', label: t('sort_paid') },
]

export default function ReceivablesScreen({ onBack }: { onBack: () => void }) {
  const t = useI18nStore(s => s.t)
  const lang = useI18nStore(s => s.lang)
  const [sort, setSort] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedR, setSelectedR] = useState<Receivable | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [collectConfirm, setCollectConfirm] = useState(false)
  const [name, setName] = useState('')
  const [amt, setAmt] = useState(0)
  const [due, setDue] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const [desc, setDesc] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addFileInputRef = useRef<HTMLInputElement>(null)
  const [addReceiptUrl, setAddReceiptUrl] = useState<string | null>(null)
  const [addReceiptPreview, setAddReceiptPreview] = useState<string | null>(null)

  const { isLoading, active, paid, totalOwed, totalCollected, overdueCount, create, update, remove, collect } = useReceivables()
  const { uploadReceipt, uploading, progress } = useReceiptUpload()
  const { fmt } = useAmount()

  const filtered = sort === 'paid' ? paid
    : sort === 'overdue' ? active.filter(r => daysUntilDue(r.due_date) < 0)
    : sort === 'active' ? active
    : active

  const handleSave = async () => {
    if (!name || amt <= 0) return
    haptic('success')
    try {
      await create({ contact_name: name, amount_cents: amt, due_date: due, note: desc || undefined, receipt_url: addReceiptUrl || undefined })
      toast.success(t('tx_saved_success'))
      setShowAdd(false); setName(''); setAmt(0); setDesc('')
      setAddReceiptUrl(null); setAddReceiptPreview(null)
    } catch (e: any) { toast.error(e.message || 'Error') }
  }

  const handleCollect = async () => {
    if (!selectedR) return
    haptic('success')
    try {
      await collect(selectedR.id)
      toast.success(t('tx_saved_success'))
      setSelectedR(null); setCollectConfirm(false)
    } catch (e: any) { toast.error(e.message || 'Error') }
  }

  const handleDelete = async () => {
    if (!selectedR) return
    haptic('error')
    try {
      await remove(selectedR.id)
      toast.success(t('tx_deleted_success'))
      setSelectedR(null); setDeleteConfirm(false)
    } catch (e: any) { toast.error(e.message || 'Error') }
  }

  const handleRemind = (r: Receivable) => {
    const tg = getTelegram()
    const text = `សួស្ដី ${r.contact_name}%0Aលោក/លោកស្រី ${r.contact_name} នៅតែជំពាក់ចំនួន ${fmtKHR(r.amount_cents)} ដែលត្រូវបង់មុនថ្ងៃ ${r.due_date}%0Aសូមទំនាក់ទំនងក្នុងពេលឆាប់។`
    if (tg?.openTelegramLink && r.phone) {
      tg.openTelegramLink(`https://t.me/${r.phone.replace('@', '')}`)
    } else {
      tg?.openTelegramLink?.(`https://t.me/share/url?text=${text}`)
    }
  }

  const handleReceiptPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedR) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    try {
      const url = await uploadReceipt(file)
      await update(selectedR.id, { receipt_url: url })
      setSelectedR({ ...selectedR, receipt_url: url })
      toast.success(lang === 'km' ? 'រូបភាពបានរក្សាទុក' : 'Receipt saved')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    }
  }

  if (isLoading) return <div className="min-h-[100dvh] animate-fadeIn relative"><ScreenHeader title={t('nav_receivables')} onBack={onBack} /><div className="px-4 pt-3"><SkeletonLoader rows={4} /></div></div>

  return (
    <div className="h-screen flex flex-col animate-fadeIn overflow-hidden">
      <ScreenHeader title={t('nav_receivables')} onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-40">
        <div className="px-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="text-[11px] font-semibold" style={{ color: 'var(--text-dim)' }}>{t('receivables_total')}</div>
              <div className="text-xl font-extrabold font-mono-num mt-1" style={{ color: 'var(--text)' }}>{fmt(totalOwed)}</div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="text-[11px] font-semibold" style={{ color: 'var(--text-dim)' }}>{t('receivables_collected')}</div>
              <div className="text-xl font-extrabold font-mono-num mt-1" style={{ color: 'var(--green)' }}>{fmt(totalCollected)}</div>
              {overdueCount > 0 && <div className="text-[10px] font-semibold mt-1" style={{ color: 'var(--red)' }}>{overdueCount} {lang === 'km' ? 'នាក់ហួសកំណត់' : 'overdue'}</div>}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {SORTS(t).map(s => (
              <Pill key={s.key} label={s.label} active={sort === s.key} onClick={() => { haptic('light'); setSort(s.key) }} />
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="💸" title={t('receivables_empty_title')}
              subtitle={sort === 'paid' ? (lang === 'km' ? 'មិនទាន់មានការទូទាត់ណាមួយ' : 'No collected payments yet.') : t('receivables_empty_subtitle')}
              action={sort !== 'paid' ? { label: t('tx_add_new'), onClick: () => setShowAdd(true) } : undefined} />
          ) : filtered.map(r => {
            const isPaid = r.status === 'paid'
            const days = isPaid ? 0 : daysUntilDue(r.due_date)
            return (
              <button key={r.id} onClick={() => { haptic('light'); setSelectedR(r); setDeleteConfirm(false); setCollectConfirm(false) }}
                className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-transform"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', opacity: isPaid ? 0.85 : 1 }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
                    style={{ background: isPaid ? 'var(--green-soft)' : 'var(--gold-soft)' }}>
                    <Icon name={isPaid ? 'check' : 'receivable'} size={16} color={isPaid ? 'var(--green)' : 'var(--gold)'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{r.contact_name}</span>
                      {isPaid && <Badge variant="success">{t('status_paid')}</Badge>}
                      {!isPaid && days < 0 && <Badge variant="error">{overdueBadgeText(days)}</Badge>}
                      {!isPaid && days >= 0 && days <= 3 && <Badge variant="warning">{overdueBadgeText(days)}</Badge>}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      {t('tx_form_date')}: {fmtDateKhmer(r.due_date)}
                      {r.note && <span className="ml-2 opacity-70">· {r.note}</span>}
                      {r.receipt_url && <span className="ml-2">📎</span>}
                    </div>
                  </div>
                  <div className="text-sm font-bold font-mono-num shrink-0" style={{ color: isPaid ? 'var(--green)' : 'var(--gold)' }}>{fmt(r.amount_cents)}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* FAB */}
      <div className="fixed fab-bottom right-6 z-40">
        <button onClick={() => { haptic('medium'); setShowAdd(true) }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-gold transition-all active:scale-95"
          style={{ background: 'var(--gold)' }}>
          <Icon name="plus" size={28} color="#000000" />
        </button>
      </div>

      {/* Detail sheet */}
      <BottomSheet isOpen={!!selectedR} onClose={() => { setSelectedR(null); setDeleteConfirm(false); setCollectConfirm(false) }}
        title={selectedR?.contact_name || ''}>
        {selectedR && (() => {
          const isPaid = selectedR.status === 'paid'
          const days = isPaid ? 0 : daysUntilDue(selectedR.due_date)
          return (
            <div className="space-y-4">
              {/* Amount hero */}
              <div className="rounded-2xl p-5 flex flex-col items-center"
                style={{ background: isPaid ? 'var(--green-soft)' : 'var(--gold-soft)' }}>
                <div className="text-[11px] font-bold mb-1 opacity-60"
                  style={{ color: isPaid ? 'var(--green)' : 'var(--gold)' }}>
                  {isPaid ? t('status_paid') : (!isPaid && days < 0 ? overdueBadgeText(days) : (lang === 'km' ? 'កំពុងរង់ចាំ' : 'Pending'))}
                </div>
                <div className="text-3xl font-extrabold font-mono-num"
                  style={{ color: isPaid ? 'var(--green)' : 'var(--gold)' }}>
                  {fmt(selectedR.amount_cents)}
                </div>
              </div>

              {/* Detail rows */}
              <div className="rounded-2xl divide-y" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-base">📅</span>
                  <span className="text-xs font-semibold flex-1" style={{ color: 'var(--text-dim)' }}>{t('form_due_date')}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{fmtDateKhmer(selectedR.due_date)}</span>
                </div>
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="text-base">📝</span>
                  <span className="text-xs font-semibold flex-1" style={{ color: 'var(--text-dim)' }}>{t('tx_form_note')}</span>
                  <span className="text-sm font-bold text-right max-w-[55%]"
                    style={{ color: selectedR.note ? 'var(--text)' : 'var(--text-dim)' }}>
                    {selectedR.note || t('tx_detail_no_note')}
                  </span>
                </div>
              </div>

              {/* Receipt */}
              <div>
                <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-sec)' }}>📎 {t('tx_receipt_label')}</div>
                {selectedR.receipt_url ? (
                  <div className="space-y-2">
                    <a href={selectedR.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                        <img src={selectedR.receipt_url} alt="Receipt" className="w-full max-h-56 object-cover" />
                        <div className="absolute bottom-0 inset-x-0 py-2 text-center text-[10px] font-bold"
                          style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                          {t('tx_receipt_tap')} ↗
                        </div>
                      </div>
                    </a>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 rounded-xl text-xs font-bold"
                      style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>
                      {lang === 'km' ? 'ប្តូររូបភាព' : 'Replace image'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'var(--input-bg)', border: '1px dashed var(--border)', color: 'var(--text-sec)' }}>
                    {uploading
                      ? <><span className="animate-pulse">{progress}%</span></>
                      : <><span>📷</span> <span>{lang === 'km' ? 'ថតរូប / ជ្រើសរូប' : 'Take photo / choose image'}</span></>
                    }
                  </button>
                )}
              </div>

              {/* Actions */}
              {!isPaid && (
                collectConfirm ? (
                  <div className="flex gap-2">
                    <button onClick={handleCollect}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                      style={{ background: 'var(--green)' }}>
                      ✓ {lang === 'km' ? 'បញ្ជាក់ទូទាត់' : 'Confirm Paid'}
                    </button>
                    <button onClick={() => setCollectConfirm(false)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold"
                      style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>
                      {t('tx_delete_cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {days < 0 && (
                      <button onClick={() => handleRemind(selectedR)}
                        className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95"
                        style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
                        <Icon name="telegram" size={14} /> {t('action_remind')}
                      </button>
                    )}
                    <button onClick={() => setCollectConfirm(true)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95"
                      style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                      <Icon name="check" size={14} /> {t('action_collect')}
                    </button>
                  </div>
                )
              )}

              {deleteConfirm ? (
                <div className="flex gap-2">
                  <button onClick={handleDelete}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'var(--red)' }}>
                    {t('tx_delete_confirm')}
                  </button>
                  <button onClick={() => setDeleteConfirm(false)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold"
                    style={{ background: 'var(--border)', color: 'var(--text-sec)' }}>
                    {t('tx_delete_cancel')}
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(true)}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
                  <Icon name="trash" size={14} color="var(--red)" /> {t('tx_delete_confirm')}
                </button>
              )}
            </div>
          )
        })()}
      </BottomSheet>

      {/* Add sheet */}
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title={t('receivables_add_title')}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('profile_form_name')}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t('profile_form_name')} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_amount')}</label><CurrencyInput value={amt} onChange={setAmt} autoFocus /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_date')}</label><input type="date" value={due} onChange={e => setDue(e.target.value)} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>{t('tx_form_note')}</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('tx_form_note_placeholder')} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>

          {/* Receipt upload in add form */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>📎 {t('tx_receipt_label')}</label>
            {addReceiptPreview ? (
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <img src={addReceiptPreview} alt="Receipt" className="w-full max-h-36 object-cover" />
                {uploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <div className="text-white text-xs font-bold">{progress}%</div>
                    <div className="w-24 h-1 rounded-full mt-1" style={{ background: 'rgba(255,255,255,0.3)' }}>
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'var(--gold)' }} />
                    </div>
                  </div>
                )}
                {!uploading && (
                  <button onClick={() => { setAddReceiptUrl(null); setAddReceiptPreview(null) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <Icon name="close" size={12} color="white" />
                  </button>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => addFileInputRef.current?.click()} disabled={uploading}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'var(--input-bg)', border: '1px dashed var(--border)', color: 'var(--text-sec)' }}>
                <span>📷</span> <span>{lang === 'km' ? 'ថតរូប / ជ្រើសរូប' : 'Take photo / choose image'}</span>
              </button>
            )}
          </div>

          <button onClick={handleSave} disabled={uploading} className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98] disabled:opacity-60" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>{uploading ? `${progress}%…` : t('tx_form_save')}</button>
        </div>
      </BottomSheet>

      {/* Hidden file inputs */}
      {/* For detail sheet (update existing) */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptPick} />
      {/* For add form (new receivable) */}
      <input ref={addFileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          if (addFileInputRef.current) addFileInputRef.current.value = ''
          setAddReceiptPreview(URL.createObjectURL(file))
          try {
            const url = await uploadReceipt(file)
            setAddReceiptUrl(url)
          } catch (err: any) {
            toast.error(err.message || 'Upload failed')
            setAddReceiptPreview(null)
          }
        }}
      />
    </div>
  )
}
