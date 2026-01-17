"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

type Theme = "dark" | "light"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const storageKey = "autest-theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")

  const applyTheme = useCallback((value: Theme) => {
    const root = document.documentElement
    root.classList.toggle("dark", value === "dark")
    root.classList.toggle("light", value === "light")
  }, [])

  const setTheme = useCallback(
    (value: Theme) => {
      setThemeState(value)
      applyTheme(value)
      localStorage.setItem(storageKey, value)
    },
    [applyTheme]
  )

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [setTheme, theme])

  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme | null
    const nextTheme = storedTheme ?? "dark"

    setThemeState(nextTheme)
    applyTheme(nextTheme)
  }, [applyTheme])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [setTheme, theme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }

  return context
}
