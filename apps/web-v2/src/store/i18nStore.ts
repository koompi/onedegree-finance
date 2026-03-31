import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { en, km } from '../lib/i18n/translations'

interface I18nState {
    lang: 'en' | 'km'
    setLang: (lang: 'en' | 'km') => void
    t: (key: keyof typeof en, vars?: Record<string, any>) => string
}

export const useI18nStore = create<I18nState>()(
    persist(
        (set, get) => ({
            lang: 'km',
            setLang: (lang) => set({ lang }),
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
