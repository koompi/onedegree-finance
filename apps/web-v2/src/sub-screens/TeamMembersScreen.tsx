import { useState, useEffect } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
import Pill from '../components/Pill'
import { useAuthStore } from '../store/authStore'
import { api, ApiError } from '../lib/api'
import { toast } from '../store/toastStore'
import { haptic } from '../lib/telegram'
import { useI18nStore } from '../store/i18nStore'

interface TeamMember {
  user_id: string
  name: string
  username?: string
  telegram_id?: string
  role: 'owner' | 'manager' | 'staff'
  active: boolean
}

interface RoleOption {
  key: 'owner' | 'manager' | 'staff'
  label: string
  color: string
  bgColor: string
}

export default function TeamMembersScreen({ onBack }: { onBack: () => void }) {
  const t = useI18nStore(s => s.t)
  const { companyId } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [showRoleChange, setShowRoleChange] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [telegramId, setTelegramId] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'staff' | null>(null)

  const ROLE_OPTIONS: RoleOption[] = [
    { key: 'owner', label: t('team_role_owner'), color: 'var(--gold)', bgColor: 'var(--gold-soft)' },
    { key: 'manager', label: t('team_role_manager'), color: 'var(--blue)', bgColor: 'var(--blue-soft)' },
    { key: 'staff', label: t('team_role_staff'), color: 'var(--text-sec)', bgColor: 'var(--border)' },
  ]

  const getRoleOption = (role: string) => ROLE_OPTIONS.find(r => r.key === role) || ROLE_OPTIONS[2]

  const fetchMembers = async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const data = await api.get<TeamMember[]>(`/${companyId}/members`)
      setMembers(data || [])
      // Set current user's role (first member is typically the current user in API response)
      if (data && data.length > 0) {
        // Find the owner to determine if current user is owner
        // In real implementation, backend should return current_user_role
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to load team members')
    }
    setIsLoading(false)
  }

  // Fetch current user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!companyId) return
      try {
        const data = await api.get<{ role: string }>(`/${companyId}/members/me`)
        setUserRole(data?.role as 'owner' | 'manager' | 'staff' || null)
      } catch {
        setUserRole('staff') // Default to least permissive
      }
    }
    fetchUserRole()
  }, [companyId])

  useEffect(() => { fetchMembers() }, [companyId])

  const handleInvite = async () => {
    if (!telegramId.trim()) {
      toast.error(t('team_invite_placeholder'))
      return
    }
    setInviteLoading(true)
    try {
      await api.post(`/${companyId}/invite`, { telegram_id: telegramId.trim() })
      toast.success(t('team_invite_success'))
      setShowInvite(false)
      setTelegramId('')
      await fetchMembers()
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 404) {
        toast.error(t('team_invite_error'))
      } else {
        toast.error(e.message || t('export_error'))
      }
    }
    setInviteLoading(false)
  }

  const handleChangeRole = async (newRole: 'owner' | 'manager' | 'staff') => {
    if (!selectedMember) return
    try {
      await api.patch(`/${companyId}/members/${selectedMember.user_id}/role`, { role: newRole })
      toast.success(t('tx_saved_success'))
      setShowRoleChange(false)
      setSelectedMember(null)
      await fetchMembers()
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 403) {
        toast.error(t('team_insufficient_perms'))
      } else {
        toast.error(e.message || t('export_error'))
      }
    }
  }

  const handleRemove = async () => {
    if (!removeConfirmId) return
    try {
      await api.delete(`/${companyId}/members/${removeConfirmId}`)
      toast.success(t('tx_deleted_success'))
      setRemoveConfirmId(null)
      await fetchMembers()
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 403) {
        toast.error(t('team_insufficient_perms'))
      } else {
        toast.error(e.message || t('export_error'))
      }
    }
  }

  const canManage = userRole === 'owner'

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] animate-fadeIn relative">
        <ScreenHeader title={t('team_title')} onBack={onBack} />
        <div className="px-4 pt-3"><SkeletonLoader rows={5} /></div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] pb-24 animate-fadeIn relative">
      <ScreenHeader title={t('team_title')} onBack={onBack} />

      <div className="px-4 space-y-3 pt-2">
        {members.length === 0 ? (
          <EmptyState
            icon="👥"
            title={t('team_title')}
            subtitle={canPlayAction() ? t('team_invite_placeholder') : t('team_not_member')}
          />
        ) : (
          members.map((member) => {
            const roleOpt = getRoleOption(member.role)
            return (
              <div
                key={member.user_id}
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ background: roleOpt.bgColor, color: roleOpt.color }}>
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {member.name}
                  </div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--text-dim)' }}>
                    {member.username ? `@${member.username}` : member.telegram_id}
                  </div>
                </div>
                <Pill
                  text={roleOpt.label}
                  color={member.role === 'owner' ? 'gold' : member.role === 'manager' ? 'blue' : 'gray'}
                />
                {canManage && member.role !== 'owner' && (
                  <div className="flex gap-1">
                    {removeConfirmId === member.user_id ? (
                      <>
                        <button
                          onClick={handleRemove}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-white"
                          style={{ background: 'var(--red)' }}
                        >
                          {t('tx_delete_confirm')}
                        </button>
                        <button
                          onClick={() => setRemoveConfirmId(null)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold"
                          style={{ background: 'var(--border)', color: 'var(--text-sec)' }}
                        >
                          {t('tx_delete_cancel')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { haptic('light'); setSelectedMember(member); setShowRoleChange(true) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg"
                          style={{ background: 'var(--gold-soft)' }}
                        >
                          <Icon name="edit" size={12} color="var(--gold)" />
                        </button>
                        <button
                          onClick={() => { haptic('medium'); setRemoveConfirmId(member.user_id) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg"
                          style={{ background: 'var(--red-soft)' }}
                        >
                          <Icon name="trash" size={12} color="var(--red)" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Invite FAB - only for owners */}
      {canManage && (
        <div className="fixed fab-bottom left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => { haptic('medium'); setShowInvite(true) }}
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90"
            style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(232,184,75,0.3)' }}
          >
            <Icon name="plus" size={22} color="var(--bg)" />
          </button>
        </div>
      )}

      {/* Invite BottomSheet */}
      <BottomSheet isOpen={showInvite} onClose={() => setShowInvite(false)} title={t('team_invite')}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sec)' }}>
              {t('team_invite_telegram_id')}
            </label>
            <input
              value={telegramId}
              onChange={e => setTelegramId(e.target.value)}
              placeholder={t('team_invite_placeholder')}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              autoFocus
            />
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-dim)' }}>
              Ask the person to start the OneDegree bot first, then enter their Telegram ID (e.g., 123456789)
            </p>
          </div>
          <button
            onClick={handleInvite}
            disabled={inviteLoading || !telegramId.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'var(--gold)', color: 'var(--bg)' }}
          >
            {inviteLoading ? t('auth_logging_in_btn') : t('tx_form_save')}
          </button>
        </div>
      </BottomSheet>

      {/* Role Change BottomSheet */}
      <BottomSheet isOpen={showRoleChange} onClose={() => { setShowRoleChange(false); setSelectedMember(null) }} title={t('team_change_role')}>
        {selectedMember && (
          <div className="space-y-3">
            <div className="text-center py-2">
              <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{selectedMember.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                {selectedMember.username ? `@${selectedMember.username}` : selectedMember.telegram_id}
              </div>
            </div>
            {ROLE_OPTIONS.map(roleOpt => (
              <button
                key={roleOpt.key}
                onClick={() => handleChangeRole(roleOpt.key)}
                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-between px-4 transition-all ${
                  selectedMember.role === roleOpt.key ? 'ring-2 ring-gold/50' : ''
                }`}
                style={{
                  background: selectedMember.role === roleOpt.key ? roleOpt.bgColor : 'var(--card)',
                  color: selectedMember.role === roleOpt.key ? roleOpt.color : 'var(--text)',
                  border: '1px solid var(--border)'
                }}
              >
                <span>{roleOpt.label}</span>
                {selectedMember.role === roleOpt.key && (
                  <Icon name="check" size={16} color={roleOpt.color} />
                )}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

function canPlayAction() {
  return true // Placeholder for permission check
}
