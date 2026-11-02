import { Link, Outlet } from 'react-router-dom'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

/** Centred shell for sign-in and sign-up. */
export default function AuthShell() {
  return (
    <div className="grid-bg flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-5 py-4 md:px-8">
        <Logo />
        <ThemeToggle />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-5 pb-16 pt-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
      <footer className="px-5 pb-6 text-center text-[0.8125rem] text-ink-muted">
        <Link to="/" className="hover:text-ink">Back to home</Link>
      </footer>
    </div>
  )
}
