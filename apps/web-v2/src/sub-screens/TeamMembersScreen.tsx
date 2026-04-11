import { useState, useEffect } from 'react'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import BottomSheet from '../components/BottomSheet'
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
  role: 'owner' | 'admin' | 'manager' | 'staff'
  active: boolean
}

interface RoleOption {
  key: 'admin' | 'manager' | 'staff'
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
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'staff'>('staff')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'manager' | 'staff' | null>(null)

  const ROLE_OPTIONS: RoleOption[] = [
    { key: 'admin', label: t('team_role_admin'), color: 'var(--purple)', bgColor: 'var(--purple-soft)' },
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
        setUserRole(data?.role as 'owner' | 'admin' | 'manager' | 'staff' || null)
      } catch {
        setUserRole('staff') // Default to least permissive
      }
    }
    fetchUserRole()
  }, [companyId])

  useEffect(() => { fetchMembers() }, [companyId])

  const handleGenerateLink = async () => {
    setInviteLoading(true)
    setInviteLink(null)
    try {
      const res = await api.post<{ link: string }>(`/${companyId}/invite-link`, { role: inviteRole })
      setInviteLink(res.link)
    } catch {
      toast.error(t('export_error'))
    }
    setInviteLoading(false)
  }

  function copyLink() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  function shareLink() {
    if (!inviteLink) return
    if (navigator.share) {
      navigator.share({ title: 'Join OneDegree Finance', url: inviteLink })
    } else {
      copyLink()
    }
  }

  const handleChangeRole = async (newRole: 'admin' | 'manager' | 'staff') => {
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

  const canManage = userRole === 'owner' || userRole === 'admin'

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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                  background: member.role === 'owner' ? 'var(--gold-soft)' : member.role === 'admin' ? 'rgba(139,92,246,0.15)' : member.role === 'manager' ? 'var(--blue-soft)' : 'var(--border)',
                  color: member.role === 'owner' ? 'var(--gold)' : member.role === 'admin' ? '#8b5cf6' : member.role === 'manager' ? 'var(--blue)' : 'var(--text-sec)',
                }}>
                  {member.role === 'owner' ? t('team_role_owner') : getRoleOption(member.role)?.label || member.role}
                </span>
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
      <BottomSheet isOpen={showInvite} onClose={() => { setShowInvite(false); setInviteLink(null) }} title={t('team_invite')}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-sec)' }}>
              {t('team_invite_role')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => { setInviteRole(opt.key); setInviteLink(null) }}
                  className="py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: inviteRole === opt.key ? opt.bgColor : 'var(--card)',
                    color: inviteRole === opt.key ? opt.color : 'var(--text-dim)',
                    border: `1px solid ${inviteRole === opt.key ? opt.color : 'var(--border)'}`,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--text-dim)' }}>
              {inviteRole === 'admin' ? t('team_role_admin_desc') : inviteRole === 'manager' ? t('team_role_manager_desc') : t('team_role_staff_desc')}
            </p>
          </div>

          {inviteLink ? (
            <div className="space-y-3">
              <div className="rounded-xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>{t('team_invite_link')}</div>
                <div className="text-[11px] break-all font-mono" style={{ color: 'var(--text)' }}>{inviteLink}</div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>{t('team_invite_expires')}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={copyLink}
                  className="py-3 rounded-xl text-sm font-bold active:scale-[0.98]"
                  style={{ background: linkCopied ? 'var(--green-soft)' : 'var(--card)', color: linkCopied ? 'var(--green)' : 'var(--text)', border: '1px solid var(--border)' }}>
                  {linkCopied ? t('pair_copied') : t('pair_copy')}
                </button>
                <button onClick={shareLink}
                  className="py-3 rounded-xl text-sm font-bold active:scale-[0.98]"
                  style={{ background: 'var(--gold)', color: 'var(--bg)' }}>
                  {t('team_invite_share')}
                </button>
              </div>
              <button onClick={() => setInviteLink(null)}
                className="w-full py-2 text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
                {t('team_invite_new_link')}
              </button>
            </div>
          ) : (
            <button onClick={handleGenerateLink} disabled={inviteLoading}
              className="w-full py-3.5 rounded-xl text-sm font-bold active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'var(--gold)', color: 'var(--bg)' }}>
              {inviteLoading ? t('pair_generating') : t('team_invite_generate')}
            </button>
          )}
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
