"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useSyncExternalStore } from "react"

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

// Custom hook to detect client-side mounting without setState in useEffect
function useIsMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "sulfur-ui-theme",
  ...props
}: ThemeProviderProps) {
  const mounted = useIsMounted()

  // Use lazy initializer to read from localStorage on first render (client-side only)
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    try {
      const stored = localStorage.getItem(storageKey)
      return (stored as Theme) || defaultTheme
    } catch {
      return defaultTheme
    }
  })

  // Compute resolved theme
  const resolvedTheme = useMemo<"dark" | "light">(() => {
    if (!mounted) return "light"
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }
    return theme
  }, [theme, mounted])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme, mounted])

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