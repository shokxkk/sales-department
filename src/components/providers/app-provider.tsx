'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Language, translations, TranslationSchema } from '@/lib/i18n'

type Theme = 'dark' | 'light'

interface AppContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationSchema
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [language, setLanguageState] = useState<Language>('ru')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read saved theme
    const savedTheme = localStorage.getItem('nerion_theme') as Theme | null
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeState(savedTheme)
      applyTheme(savedTheme)
    } else {
      applyTheme('dark')
    }

    // Read saved language
    const savedLang = localStorage.getItem('nerion_lang') as Language | null
    if (savedLang === 'ru' || savedLang === 'uz') {
      setLanguageState(savedLang)
    }

    setMounted(true)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === 'light') {
      root.classList.remove('dark')
      root.classList.add('light')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
    }
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('nerion_theme', newTheme)
    applyTheme(newTheme)
  }

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
  }

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang)
    localStorage.setItem('nerion_lang', newLang)
  }

  const t: TranslationSchema = translations[language] || translations.ru

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        language,
        setLanguage,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useApp()
  return { theme, setTheme, toggleTheme }
}

export function useLanguage() {
  const { language, setLanguage, t } = useApp()
  return { language, setLanguage, t }
}
