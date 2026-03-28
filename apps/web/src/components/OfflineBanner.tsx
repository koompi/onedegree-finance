import { useState, useEffect } from 'react'
export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false); const off = () => setOffline(true)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!offline) return null
  return <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center text-sm py-1 z-50">គ្មានអ៊ីនធឺណិត — កំពុងរក្សាទុកក្នុងឧបករណ៍</div>
}
