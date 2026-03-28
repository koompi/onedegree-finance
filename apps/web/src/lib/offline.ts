import localforage from 'localforage'
import { api } from './api'

interface QueuedRequest { method: string; url: string; data?: unknown; id: string }

const QUEUE_KEY = 'offline-queue'

export async function queueRequest(req: Omit<QueuedRequest, 'id'>) {
  const queue: QueuedRequest[] = (await localforage.getItem(QUEUE_KEY)) || []
  queue.push({ ...req, id: crypto.randomUUID() })
  await localforage.setItem(QUEUE_KEY, queue)
}

export async function flushQueue() {
  const queue: QueuedRequest[] = (await localforage.getItem(QUEUE_KEY)) || []
  if (!queue.length) return
  const remaining: QueuedRequest[] = []
  for (const req of queue) {
    try {
      await api.request({ method: req.method, url: req.url, data: req.data })
    } catch { remaining.push(req) }
  }
  await localforage.setItem(QUEUE_KEY, remaining)
}

export function setupOfflineSync() {
  window.addEventListener('online', flushQueue)
}
