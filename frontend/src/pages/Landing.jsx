import { ArrowRight, BarChart3, Briefcase, CheckCircle2, ClipboardList, FileText, Lock, Palette, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/ui'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSession } from '../context/session'

const FEATURES = [
  { icon: BarChart3, title: 'Resume score, explained', text: 'See exactly which parts of your resume earn points, and what would raise the score.' },
  { icon: FileText, title: 'Section and skill check', text: 'Find out which headings and skills a recruiter will see, and which are missing.' },
  { icon: Briefcase, title: 'Match against a job', text: 'Paste a job posting and see which required and nice-to-have skills you already show.' },
  { icon: ClipboardList, title: 'Application tracker', text: 'Track every application from saved to offer, with private notes for each one.' },
  { icon: Printer, title: 'Export reports', text: 'Print any report or save it as a PDF to share with a mentor or careers adviser.' },
  { icon: Palette, title: 'Read it your way', text: 'Light, dark or system theme, three fonts and four text sizes, saved to your account.' },
]

const STEPS = [
  ['Upload', 'Add your resume as a PDF, Word or text file.'],
  ['Review', 'Read the score, the sections and the skills we found.'],
  ['Compare', 'Paste a job description to see what matches and what is missing.'],
  ['Track', 'Move the application along and keep notes for interviews.'],
]

export default function Landing() {
  usePageTitle('Find out how your resume reads')
  const { status } = useSession()
  const signedIn = status === 'authed'
  const primary = signedIn ? { to: '/app', label: 'Go to dashboard' } : { to: '/register', label: 'Create free account' }

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-marketing items-center justify-between gap-4 px-5 md:px-8">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-7 text-[0.875rem] text-ink-soft md:flex">
            <a className="hover:text-ink" href="#features">Features</a>
            <a className="hover:text-ink" href="#how">How it works</a>
            <a className="hover:text-ink" href="#privacy">Privacy</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {signedIn ? (
              <Button to="/app" size="sm">Dashboard</Button>
            ) : (
              <>
                <Button to="/login" size="sm" variant="ghost" className="hidden sm:inline-flex">Sign in</Button>
                <Button to="/register" size="sm">Get started</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="grid-bg border-b border-line">
          <div className="mx-auto grid max-w-marketing items-center gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="eyebrow mb-5">Resume review and job matching</p>
              <h1 className="t-display max-w-[16ch]">See how your resume reads, and what a job is really asking for.</h1>
              <p className="t-lead mt-6 max-w-prose">
                Upload your resume, get a clear score with the reasons behind it, then compare it with any job posting.
                Track every application in one place.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button to={primary.to} size="lg" icon={ArrowRight}>{primary.label}</Button>
                <Button href="#how" size="lg" variant="secondary">See how it works</Button>
              </div>
            </div>

            <div className="card p-6 shadow-none" aria-label="What you get">
              <p className="eyebrow mb-4">What you get</p>
              <ul className="space-y-4">
                {['Score with a breakdown by section', 'Skills found, grouped by category', 'Required skills missing from your resume', 'Prioritised steps to improve it', 'A tracker for every application'].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                    <span className="text-ink-soft">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 mx-auto max-w-marketing px-5 py-20 md:px-8 md:py-24">
          <p className="eyebrow mb-3">Features</p>
          <h2 className="t-h2 max-w-[24ch]">Everything you need to apply with confidence.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-surface p-6">
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-surface-soft text-ink-soft"><Icon size={18} aria-hidden /></span>
                <h3 className="t-h4">{title}</h3>
                <p className="mt-2 text-ink-soft">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto max-w-marketing px-5 py-20 md:px-8 md:py-24">
            <p className="eyebrow mb-3">How it works</p>
            <h2 className="t-h2">Four steps from upload to offer.</h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-4">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="border-t border-ink pt-5">
                  <p className="mono text-ink-muted">0{i + 1}</p>
                  <h3 className="t-h4 mt-2">{t}</h3>
                  <p className="mt-2 text-ink-soft">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="scroll-mt-20 mx-auto max-w-marketing px-5 py-20 md:px-8 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow mb-3">Privacy</p>
              <h2 className="t-h2">Your documents stay yours.</h2>
            </div>
            <ul className="divide-y divide-line border-y border-line">
              {[
                'Passwords are stored as salted scrypt hashes, never in readable form.',
                'Changing your password signs you out of every other device.',
                'Download your original files at any time.',
                'Deleting your account removes your resumes, jobs, applications and uploaded files.',
              ].map((t) => (
                <li key={t} className="flex gap-4 py-4">
                  <Lock size={16} className="mt-1 shrink-0 text-ink-muted" aria-hidden />
                  <span className="text-ink-soft">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-marketing px-5 pb-24 pt-8 text-center md:px-8">
          <h2 className="t-h1 mx-auto max-w-[20ch]">Start with your current resume.</h2>
          <p className="t-lead mx-auto mt-4 max-w-prose">It takes a minute. You can delete everything later.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button to={primary.to} size="lg" icon={ArrowRight}>{primary.label}</Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-marketing flex-col items-start justify-between gap-4 px-5 py-8 text-[0.8125rem] text-ink-muted md:flex-row md:items-center md:px-8">
          <Logo />
          <p>A scored review of your document, not a hiring prediction.</p>
          <Link to={primary.to} className="hover:text-ink">{primary.label}</Link>
        </div>
      </footer>
    </div>
  )
}
