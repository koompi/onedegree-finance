import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export interface InventoryItem {
  id: string; name: string; sku?: string; unit?: string; current_qty: number; wac_cost: number; reorder_level: number
}

export function useInventory() {
  const companyId = useAuthStore(s => s.companyId)
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<InventoryItem[]>([])

  const fetch = useCallback(async () => {
    if (!companyId) return
    setIsLoading(true)
    try { setItems(await api.get<InventoryItem[]>(`/${companyId}/inventory/items`) || []) }
    catch (e) { console.error(e) }
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { fetch() }, [fetch])

  const totalValue = items.reduce((s, i) => s + (i.current_qty * i.wac_cost), 0)
  const lowStockCount = items.filter(i => i.current_qty <= i.reorder_level).length

  const create = async (body: any) => { await api.post(`/${companyId}/inventory/items`, body); await fetch() }
  const remove = async (id: string) => { await api.delete(`/${companyId}/inventory/items/${id}`); await fetch() }
  const addMovement = async (id: string, body: any) => { await api.post(`/${companyId}/inventory/items/${id}/movements`, body); await fetch() }

  return { isLoading, items, totalValue, lowStockCount, create, remove, addMovement, refetch: fetch }
}
