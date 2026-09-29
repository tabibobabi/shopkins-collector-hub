'use client'

import { useEffect, useSyncExternalStore } from 'react'

type ThemePreference = 'system' | 'light' | 'dark'

const THEME_EVENT = 'theme-preference-change'
const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}
const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark',
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem('theme')
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(THEME_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

function applyTheme(preference: ThemePreference) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = preference === 'dark' || (preference === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
}

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  if (preference === 'light') {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="6" y="6" width="4" height="4" fill="currentColor" />
        <rect x="5" y="7" width="6" height="2" fill="currentColor" />
        <rect x="7" y="5" width="2" height="6" fill="currentColor" />
        <rect x="7" y="1" width="2" height="2" fill="currentColor" />
        <rect x="7" y="13" width="2" height="2" fill="currentColor" />
        <rect x="1" y="7" width="2" height="2" fill="currentColor" />
        <rect x="13" y="7" width="2" height="2" fill="currentColor" />
        <rect x="3" y="3" width="2" height="2" fill="currentColor" />
        <rect x="11" y="3" width="2" height="2" fill="currentColor" />
        <rect x="3" y="11" width="2" height="2" fill="currentColor" />
        <rect x="11" y="11" width="2" height="2" fill="currentColor" />
      </svg>
    )
  }

  if (preference === 'dark') {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="6" y="2" width="4" height="2" fill="currentColor" />
        <rect x="4" y="4" width="4" height="2" fill="currentColor" />
        <rect x="3" y="6" width="4" height="4" fill="currentColor" />
        <rect x="4" y="10" width="4" height="2" fill="currentColor" />
        <rect x="6" y="12" width="6" height="2" fill="currentColor" />
        <rect x="10" y="10" width="3" height="2" fill="currentColor" />
        <rect x="12" y="4" width="2" height="2" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="7" y="1" width="2" height="14" fill="currentColor" />
      <rect x="1" y="7" width="14" height="2" fill="currentColor" />
      <rect x="5" y="5" width="6" height="6" fill="currentColor" />
    </svg>
  )
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribe,
    readPreference,
    () => 'system'
  )

  useEffect(() => {
    const current = readPreference()
    applyTheme(current)
    if (current !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyTheme('system')
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [preference])

  function cycleTheme() {
    const next = NEXT_THEME[preference]
    try {
      if (next === 'system') {
        localStorage.removeItem('theme')
      } else {
        localStorage.setItem('theme', next)
      }
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Theme: ${THEME_LABELS[preference]} (click to change)`}
      aria-label={`Theme: ${THEME_LABELS[preference]}. Switch to ${THEME_LABELS[NEXT_THEME[preference]]}`}
      className={`btn-ghost btn-sm h-9 min-w-9 gap-1.5 px-2.5 text-primary-ink ${className}`}
    >
      <ThemeIcon preference={preference} />
      <span className="hidden font-pixel text-[11px] font-normal sm:inline">
        {THEME_LABELS[preference]}
      </span>
    </button>
  )
}
