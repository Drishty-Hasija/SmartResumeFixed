import { Monitor, Moon, Sun } from 'lucide-react'
import { useSession } from '../context/session'
import { cx } from '../utils/format'

const CYCLE = ['light', 'dark', 'system']
const ICON = { light: Sun, dark: Moon, system: Monitor }
const LABEL = { light: 'Light', dark: 'Dark', system: 'System' }

/** Cycles light → dark → system. Works signed out (device) and signed in (saved to the account). */
export default function ThemeToggle({ className }) {
  const { prefs, updatePrefs } = useSession()
  const next = CYCLE[(CYCLE.indexOf(prefs.theme) + 1) % CYCLE.length]
  const Icon = ICON[prefs.theme] || Monitor
  return (
    <button
      type="button"
      onClick={() => updatePrefs({ theme: next }).catch(() => {})}
      aria-label={`Theme: ${LABEL[prefs.theme]}. Switch to ${LABEL[next]}`}
      title={`Theme: ${LABEL[prefs.theme]}`}
      className={cx('btn btn-ghost btn-sm h-9 w-9 p-0', className)}
    >
      <Icon size={17} aria-hidden />
    </button>
  )
}
