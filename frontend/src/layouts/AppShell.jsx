import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Briefcase, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Plus, Settings, Target, X } from 'lucide-react'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import { useSession } from '../context/session'
import { cx, initials } from '../utils/format'

const NAV = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/resumes', label: 'Resumes', icon: FileText },
  { to: '/app/jobs', label: 'Job descriptions', icon: Briefcase },
  { to: '/app/compare', label: 'Compare', icon: Target },
  { to: '/app/applications', label: 'Applications', icon: ClipboardList },
]

function NavItems({ onNavigate, compact = false }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate} title={label}
          className={({ isActive }) => cx(
            'flex h-10 items-center gap-3 rounded-lg px-3 text-[0.875rem] font-medium transition-colors',
            compact && 'justify-center px-0 lg:justify-start lg:px-3',
            isActive ? 'bg-surface-soft text-ink shadow-[inset_2px_0_0_rgb(var(--accent))]' : 'text-ink-soft hover:bg-surface-soft hover:text-ink',
          )}>
          <Icon size={18} aria-hidden strokeWidth={1.8} />
          <span className={cx(compact && 'sr-only lg:not-sr-only')}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function UserMenu() {
  const { user, signOut } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const out = async () => {
    setOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-surface-soft">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[0.75rem] font-semibold text-canvas" aria-hidden>{initials(user?.name)}</span>
        <span className="hidden text-left text-[0.8125rem] leading-tight md:block">
          <span className="block max-w-[10rem] truncate font-medium">{user?.name}</span>
          <span className="block max-w-[10rem] truncate text-ink-muted">{user?.email}</span>
        </span>
      </button>
      {open && (
        <div role="menu" className="animate-pop absolute right-0 top-full z-40 mt-2 w-64 rounded-lg border border-line bg-surface p-1.5 shadow-menu">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate font-medium">{user?.name}</p>
            <p className="t-small truncate text-ink-muted">{user?.email}</p>
          </div>
          <Link role="menuitem" to="/app/settings" onClick={() => setOpen(false)} className="mt-1 flex h-9 items-center gap-2.5 rounded-md px-3 text-[0.875rem] hover:bg-surface-soft">
            <Settings size={16} aria-hidden />Settings
          </Link>
          <button role="menuitem" type="button" onClick={out} className="flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-left text-[0.875rem] text-danger hover:bg-danger-soft">
            <LogOut size={16} aria-hidden />Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppShell() {
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => { setDrawer(false); window.scrollTo({ top: 0 }) }, [pathname])
  useEffect(() => {
    if (!drawer) return undefined
    const onKey = (e) => e.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [drawer])

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:shadow-menu">Skip to content</a>

      {/* Desktop sidebar: icons only on medium screens, labels from large screens */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-16 flex-col border-r border-line bg-surface md:flex lg:w-60">
        <div className="flex h-16 items-center justify-center border-b border-line px-3 lg:justify-start lg:px-5">
          <Logo to="/app" compact className="lg:hidden" />
          <Logo to="/app" className="hidden lg:inline-flex" />
        </div>
        <div className="flex-1 p-2.5 lg:p-3"><NavItems compact /></div>
        <div className="border-t border-line p-2.5 lg:p-3">
          <Link to="/app/settings" title="Settings" className={cx('flex h-10 items-center gap-3 rounded-lg px-3 text-[0.875rem] font-medium text-ink-soft hover:bg-surface-soft hover:text-ink', 'justify-center lg:justify-start', pathname.startsWith('/app/settings') && 'bg-surface-soft text-ink')}>
            <Settings size={18} aria-hidden strokeWidth={1.8} /><span className="sr-only lg:not-sr-only">Settings</span>
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="no-print fixed inset-0 z-40 md:hidden" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <div className="absolute inset-0 bg-ink/40" aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Navigation" className="animate-pop absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface p-4 shadow-modal">
            <div className="mb-4 flex items-center justify-between">
              <Logo to="/app" />
              <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="btn btn-ghost btn-sm h-9 w-9 p-0"><X size={18} aria-hidden /></button>
            </div>
            <NavItems onNavigate={() => setDrawer(false)} />
            <div className="mt-auto border-t border-line pt-3">
              <Link to="/app/settings" onClick={() => setDrawer(false)} className="flex h-10 items-center gap-3 rounded-lg px-3 text-[0.875rem] text-ink-soft hover:bg-surface-soft">
                <Settings size={18} aria-hidden />Settings
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="md:pl-16 lg:pl-60">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <button type="button" aria-label="Open menu" onClick={() => setDrawer(true)} className="btn btn-ghost btn-sm h-9 w-9 p-0"><Menu size={19} aria-hidden /></button>
            <Logo to="/app" compact />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            {pathname !== '/app' && <Link to="/app/resumes/new" className="btn btn-primary btn-sm hidden sm:inline-flex"><Plus size={15} aria-hidden />Upload resume</Link>}
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-app px-4 pb-24 pt-8 md:px-8 md:pb-16 md:pt-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
