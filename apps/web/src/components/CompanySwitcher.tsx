import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

export default function CompanySwitcher() {
  const { companyId, setCompany } = useAuth()
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })

  if (!companies?.length || companies.length <= 1) {
    return companies?.[0] ? (
      <p className="text-sm font-semibold text-gray-900">{companies[0].name}</p>
    ) : null
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {companies.map((c: { id: string; name: string }) => (
        <button key={c.id} type="button" onClick={() => setCompany(c.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.98] ${
            companyId === c.id
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-500 border border-gray-100'
          }`}>
          {c.name}
        </button>
      ))}
    </div>
  )
}
