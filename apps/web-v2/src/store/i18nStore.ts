import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { en, km } from '../lib/i18n/translations'

interface I18nState {
    lang: 'en' | 'km'
    currency: 'KHR' | 'USD'
    usdRate: number
    setLang: (lang: 'en' | 'km') => void
    setCurrency: (c: 'KHR' | 'USD') => void
    setUsdRate: (rate: number) => void
    t: (key: keyof typeof en, vars?: Record<string, any>) => string
}

export const useI18nStore = create<I18nState>()(
    persist(
        (set, get) => ({
            lang: 'km',
            currency: 'KHR',
            usdRate: 4100,
            setLang: (lang) => set({ lang }),
            setCurrency: (currency) => set({ currency }),
            setUsdRate: (usdRate) => set({ usdRate }),
            t: (key, vars) => {
                const dict = get().lang === 'en' ? en : km
                let val = dict[key] || en[key] || key
                if (vars) {
                    Object.entries(vars).forEach(([k, v]) => {
                        val = val.replace(`{${k}}`, String(v))
                    })
                }
                return val
            }
        }),
        { name: 'od-lang' }
    )
)
