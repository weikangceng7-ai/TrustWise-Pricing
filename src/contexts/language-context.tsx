"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

type Lang = "zh" | "en"

const translations: Record<Lang, Record<string, string>> = {
  zh: {
    "nav.features": "功能",
    "nav.cases": "客户案例",
    "nav.pricing": "定价",
    "nav.about": "关于",
    "nav.privacy": "隐私政策",
    "nav.terms": "用户协议",
    "nav.dashboard": "进入仪表盘",
    "nav.login": "登录",
    "nav.register": "免费注册",
  },
  en: {
    "nav.features": "Features",
    "nav.cases": "Cases",
    "nav.pricing": "Pricing",
    "nav.about": "About",
    "nav.privacy": "Privacy",
    "nav.terms": "Terms",
    "nav.dashboard": "Dashboard",
    "nav.login": "Sign In",
    "nav.register": "Get Started",
  },
}

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "zh",
  setLang: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("lang")
    if (stored === "en" || stored === "zh") {
      setLangState(stored)
    }
    setMounted(true)
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem("lang", l)
  }, [])

  const t = useCallback(
    (key: string) => translations[lang]?.[key] || key,
    [lang]
  )

  // Prevent hydration mismatch by rendering with "zh" until mounted
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ lang: "zh", setLang, t: (key: string) => translations.zh[key] || key }}>
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export { translations }
