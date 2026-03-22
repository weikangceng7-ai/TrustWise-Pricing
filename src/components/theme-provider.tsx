"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
  mounted: boolean
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  resolvedTheme: "light",
  mounted: false,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "sulfur-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light")

  // Read from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null
    if (stored) {
      setThemeState(stored)
    }
    setMounted(true)
  }, [storageKey])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    const applyTheme = theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : theme

    root.classList.add(applyTheme)
    setResolvedTheme(applyTheme)
  }, [theme, mounted])

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme)
    setThemeState(newTheme)
  }, [storageKey])

  const value = {
    theme,
    setTheme,
    resolvedTheme,
    mounted,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}