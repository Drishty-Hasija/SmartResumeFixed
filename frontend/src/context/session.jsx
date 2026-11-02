import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, ApiError, tokenStore } from '../services/api'
import { applyPrefs, DEFAULT_PREFS, isDefault, loadLocalPrefs, normalise, saveLocalPrefs } from '../lib/prefs'

/**
 * Session + preferences in one place.
 * status: 'loading' (checking a saved token) | 'anon' | 'authed'
 * Preferences work signed out too (stored on the device); when signed in the server copy wins.
 */
const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'loading' : 'anon'))
  const [prefs, setPrefs] = useState(loadLocalPrefs)

  const adopt = useCallback((u) => {
    setUser(u)
    setStatus('authed')
    if (u?.preferences) setPrefs(normalise(u.preferences))
  }, [])

  /** First sign-in: an account with untouched defaults takes the choices made on this device. */
  const adoptAfterSignIn = useCallback(async (u) => {
    const local = loadLocalPrefs()
    if (isDefault(u.preferences || {}) && !isDefault(local)) {
      const saved = await api.updatePreferences(local)
      adopt({ ...u, preferences: saved })
    } else {
      adopt(u)
    }
  }, [adopt])

  const forget = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
    setStatus('anon')
  }, [])

  // Restore a saved session on load
  useEffect(() => {
    if (!tokenStore.get()) return
    api.me().then(adopt).catch((e) => {
      if (e instanceof ApiError && e.status === 401) forget()
      else setStatus('anon') // server unreachable: stay signed out but keep the token
    })
  }, [adopt, forget])

  // Any expired session signs the user out everywhere
  useEffect(() => {
    const onExpired = () => forget()
    window.addEventListener('sr:session-expired', onExpired)
    return () => window.removeEventListener('sr:session-expired', onExpired)
  }, [forget])

  // Apply and remember preferences; follow the OS when theme = system
  useEffect(() => {
    applyPrefs(prefs)
    saveLocalPrefs(prefs)
  }, [prefs])
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onChange = () => applyPrefs(prefs)
    mq?.addEventListener?.('change', onChange)
    return () => mq?.removeEventListener?.('change', onChange)
  }, [prefs])

  const value = useMemo(() => ({
    user,
    status,
    prefs,
    signIn: async (email, password) => {
      const r = await api.login(email, password)
      tokenStore.set(r.token)
      await adoptAfterSignIn(r.user)
    },
    signUp: async (name, email, password) => {
      const r = await api.register(name, email, password)
      tokenStore.set(r.token)
      await adoptAfterSignIn(r.user)
    },
    signOut: async () => {
      try { await api.logout() } catch { /* already signed out on the server */ }
      forget()
    },
    updateProfile: async (payload) => {
      const u = await api.updateProfile(payload)
      setUser(u)
      return u
    },
    changePassword: async (current, next) => {
      const r = await api.changePassword(current, next)
      tokenStore.set(r.token) // every other device has been signed out
      setUser(r.user)
    },
    deleteAccount: async (password) => {
      await api.deleteAccount(password)
      forget()
    },
    updatePrefs: async (changes) => {
      setPrefs((p) => ({ ...p, ...changes }))
      if (tokenStore.get() && status === 'authed') {
        const saved = await api.updatePreferences(changes)
        setPrefs(normalise(saved))
      }
    },
    resetPrefs: async () => {
      setPrefs({ ...DEFAULT_PREFS })
      if (status === 'authed') setPrefs(normalise(await api.updatePreferences(DEFAULT_PREFS)))
    },
  }), [user, status, prefs, adopt, adoptAfterSignIn, forget])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
