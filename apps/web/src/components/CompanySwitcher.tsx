import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

export default function CompanySwitcher() {
  const { companyId, setCompany } = useAuth()
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })

  if (!companies?.length) return null

  return (
    <select
      value={companyId || ''}
      onChange={e => setCompany(e.target.value)}
      className="w-full p-2 rounded-lg border border-gray-200 text-sm font-medium bg-white"
    >
      {companies.map((c: { id: string; name: string }) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
}
