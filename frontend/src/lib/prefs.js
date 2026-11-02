/** Display preferences: theme, font, text size, motion. Applied as data-attributes on <html>. */
export const DEFAULT_PREFS = { theme: 'system', font: 'inter', text_size: 'md', reduce_motion: false }

const KEY = 'sr_prefs'

export const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter', hint: 'Modern sans-serif (default)' },
  { value: 'system', label: 'System', hint: 'Your device’s own font' },
  { value: 'serif', label: 'Serif', hint: 'Georgia-style, easier for long reading' },
]
export const SIZE_OPTIONS = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Default' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
]
export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export function loadLocalPrefs() {
  try {
    return normalise(JSON.parse(localStorage.getItem(KEY) || '{}'))
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function saveLocalPrefs(prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* private mode: keep going */ }
}

export function normalise(p = {}) {
  return { ...DEFAULT_PREFS, ...p }
}

export function isDefault(p) {
  const n = normalise(p)
  return Object.keys(DEFAULT_PREFS).every((k) => n[k] === DEFAULT_PREFS[k])
}

export function resolveTheme(theme) {
  if (theme === 'dark' || theme === 'light') return theme
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyPrefs(prefs) {
  const p = normalise(prefs)
  const root = document.documentElement
  root.dataset.theme = resolveTheme(p.theme)
  root.dataset.font = p.font
  root.dataset.size = p.text_size
  root.dataset.motion = p.reduce_motion ? 'reduce' : 'full'
}
