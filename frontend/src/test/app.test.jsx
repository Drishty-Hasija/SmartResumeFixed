import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { SessionProvider } from '../context/session'
import { ToastProvider } from '../components/feedback'
import { validateFile } from '../hooks/useUpload'
import { applyPrefs, DEFAULT_PREFS, normalise } from '../lib/prefs'
import { tokenStore } from '../services/api'

// Real responses captured from the running backend (scripts/capture_fixtures.sh).
import dashboard from './fixtures/dashboard.json'
import history from './fixtures/history.json'
import job from './fixtures/job.json'
import jobs from './fixtures/jobs.json'
import me from './fixtures/me.json'
import matches from './fixtures/matches.json'
import matchDetail from './fixtures/match_detail.json'
import resume from './fixtures/resume.json'
import resumes from './fixtures/resumes.json'

const json = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data), url: '' })
const NO_CONTENT = () => Promise.resolve({ ok: true, status: 204, json: () => Promise.reject(new Error('no body')), url: '' })
const err = (status, code, message, extra = {}) => json({ error: { code, message, ...extra } }, status)

/** Route fetch by "METHOD /path". Handlers receive {body} and may return a response promise. */
function mockFetch(routes) {
  const calls = []
  vi.stubGlobal('fetch', vi.fn((url, opts = {}) => {
    const method = opts.method || 'GET'
    const path = url.split('?')[0]
    const body = opts.body ? JSON.parse(opts.body) : undefined
    calls.push({ method, path, url, body, headers: opts.headers || {} })
    const handler = routes[`${method} ${path}`]
    if (handler === undefined) return json({ error: { message: `unmocked ${method} ${path}` } }, 500)
    return typeof handler === 'function' ? handler({ body, url }) : json(handler)
  }))
  return calls
}

const signedIn = () => tokenStore.set('test-token')
const base = { 'GET /api/auth/me': me, 'GET /api/dashboard': dashboard, 'GET /api/match': matches, 'GET /api/resumes': resumes, 'GET /api/jobs': jobs }

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  window.scrollTo = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

/* ------------------------------------------------------------- public */
describe('Landing', () => {
  it('leads with the product promise and has no implementation jargon', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: /see how your resume reads/i })).toBeInTheDocument()
    const text = document.body.textContent
    for (const word of ['TF-IDF', 'spaCy', 'NER', 'cosine', 'lemmati', 'tokeni', 'NLP']) {
      expect(text).not.toContain(word)
    }
    expect(screen.getAllByRole('link', { name: /create free account/i })[0]).toHaveAttribute('href', '/register')
  })
})

describe('Authentication', () => {
  it('sends signed-out visitors to sign in, then returns them to the page they asked for', async () => {
    mockFetch({ 'POST /api/auth/login': { token: 'new-token', user: me } , ...base })
    renderAt('/app/applications')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'aarav@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-battery-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(tokenStore.get()).toBe('new-token'))
    expect(await screen.findByRole('heading', { name: 'Applications' })).toBeInTheDocument()
  })

  it('shows the server’s message for a wrong password', async () => {
    mockFetch({ 'POST /api/auth/login': () => err(401, 'invalid_credentials', 'Email or password is incorrect.') })
    renderAt('/login')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'aarav@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'nope-nope-nope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(tokenStore.get()).toBeNull()
  })

  it('validates sign-up locally before calling the server', async () => {
    const calls = mockFetch({})
    renderAt('/register')
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ada' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('signs out from the user menu and ends the session on the server', async () => {
    signedIn()
    const calls = mockFetch({ ...base, 'POST /api/auth/logout': NO_CONTENT })
    renderAt('/app')
    await screen.findByRole('heading', { level: 1 })
    fireEvent.click(document.querySelector('[aria-haspopup="menu"]'))
    fireEvent.click(await screen.findByRole('menuitem', { name: /sign out/i }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/auth/logout')).toBe(true)
    expect(tokenStore.get()).toBeNull()
  })

  it('signs the user out everywhere when the server reports the session has expired', async () => {
    signedIn()
    mockFetch({ 'GET /api/auth/me': me, 'GET /api/dashboard': () => err(401, 'session_expired', 'Your session has ended. Please sign in again.') })
    renderAt('/app')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(tokenStore.get()).toBeNull()
  })

  it('sends the bearer token with every authenticated request', async () => {
    signedIn()
    const calls = mockFetch(base)
    renderAt('/app')
    await screen.findByText('Average resume score')
    const dash = calls.find((c) => c.path === '/api/dashboard')
    expect(dash.headers.Authorization).toBe('Bearer test-token')
  })

  it('tells the user when the server cannot be reached, without raw errors', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    renderAt('/login')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/can’t reach the smartresume server/i)
    expect(document.body.textContent).not.toContain('Failed to fetch')
  })
})

/* ---------------------------------------------------------- app pages */
describe('Overview', () => {
  it('shows the latest resume score and pipeline counts from real data', async () => {
    signedIn()
    mockFetch(base)
    renderAt('/app')
    expect(await screen.findByRole('heading', { name: /aarav/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /resume score: \d+ out of 100/i })).toBeInTheDocument()
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
  })
})

describe('Resumes', () => {
  it('lists resumes and deletes one after confirmation', async () => {
    signedIn()
    const calls = mockFetch({ ...base, 'DELETE /api/resumes/1': NO_CONTENT })
    renderAt('/app/resumes')
    fireEvent.click(await screen.findByRole('button', { name: /delete sample_resume\.pdf/i }))
    const dialog = await screen.findByRole('dialog', { name: /delete this resume/i })
    expect(dialog).toHaveTextContent('permanently removed')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete resume' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/resumes/1')).toBe(true))
  })

  it('closes a dialog with Escape', async () => {
    signedIn()
    mockFetch(base)
    renderAt('/app/resumes')
    fireEvent.click(await screen.findByRole('button', { name: /delete sample_resume\.pdf/i }))
    await screen.findByRole('dialog')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('rejects an unsupported upload immediately, with a clear reason', async () => {
    signedIn()
    const calls = mockFetch(base)
    renderAt('/app/resumes/new')
    const input = await screen.findByLabelText(/drop your resume here|browse/i, { selector: 'input' }).catch(() => document.getElementById('file-input'))
    fireEvent.change(input, { target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] } })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Unsupported file type (.png).')
    expect(alert).toHaveTextContent('Upload a PDF, DOCX or TXT file.')
    expect(calls.some((c) => c.path === '/api/resumes/upload')).toBe(false)
  })

  it('checks files before upload', () => {
    expect(validateFile(new File(['x'], 'a.exe'))).toMatchObject({ message: expect.stringContaining('Unsupported') })
    expect(validateFile(new File([], 'a.pdf'))).toMatchObject({ message: 'This file is empty.' })
    expect(validateFile(new File(['x'], 'ok.DOCX'))).toBeNull()
    const big = new File(['x'], 'big.pdf'); Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
    expect(validateFile(big)).toMatchObject({ message: expect.stringContaining('larger than 10 MB') })
  })

  it('shows a resume report with the breakdown, sections and suggestions', async () => {
    signedIn()
    mockFetch({ ...base, 'GET /api/resumes/1': resume })
    renderAt('/app/resumes/1')
    expect(await screen.findByRole('heading', { name: 'Score breakdown' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sections' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How to improve' })).toBeInTheDocument()
    // The resume's own skills may name tools like spaCy; the UI's labels must not explain the technique.
    expect(screen.queryByText(/TF-IDF \+|spaCy NER|rule-based|lemmatisation|tokenis/i)).toBeNull()
  })
})

describe('Applications', () => {
  it('changes the stage from the list and saves it', async () => {
    signedIn()
    const calls = mockFetch({ ...base, 'PATCH /api/match/1': { ...matchDetail, status: 'interviewing' } })
    renderAt('/app/applications')
    const select = await waitFor(() => {
      const el = document.getElementById('status-1')
      expect(el).toBeTruthy()
      return el
    })
    fireEvent.change(select, { target: { value: 'interviewing' } })
    await waitFor(() => {
      const patch = calls.find((c) => c.method === 'PATCH')
      expect(patch?.body).toEqual({ status: 'interviewing' })
    })
  })

  it('saves private notes on an application', async () => {
    signedIn()
    const calls = mockFetch({ 'GET /api/match/1': matchDetail, 'PATCH /api/match/1': { ...matchDetail, notes: 'Call on Monday' }, ...base })
    renderAt('/app/applications/1')
    const notes = await screen.findByLabelText('Notes')
    fireEvent.change(notes, { target: { value: 'Call on Monday' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save notes' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH' && c.path === '/api/match/1')?.body).toEqual({ notes: 'Call on Monday' }))
  })

  it('shows the job match report with skills to add', async () => {
    signedIn()
    mockFetch({ ...base, 'GET /api/match/1': matchDetail })
    renderAt('/app/applications/1')
    expect(await screen.findByRole('heading', { name: 'Skills to add' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Next steps' })).toBeInTheDocument()
  })
})

describe('Job descriptions', () => {
  it('opens the add dialog and closes it with Escape', async () => {
    signedIn()
    mockFetch(base)
    renderAt('/app/jobs')
    fireEvent.click(await screen.findByRole('button', { name: /add job/i }))
    expect(await screen.findByRole('dialog', { name: /add a job description/i })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

/* ----------------------------------------------------------- settings */
describe('Settings → Appearance', () => {
  it('applies theme, font and text size immediately and saves them to the account', async () => {
    signedIn()
    const calls = mockFetch({ ...base, 'PUT /api/user/preferences': (req) => json({ ...DEFAULT_PREFS, ...req.body }) })
    renderAt('/app/settings?tab=appearance')
    fireEvent.click(await screen.findByRole('radio', { name: 'Dark' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(calls.find((c) => c.method === 'PUT' && c.path === '/api/user/preferences')?.body).toEqual({ theme: 'dark' })

    fireEvent.click(screen.getByRole('radio', { name: 'Serif' }))
    await waitFor(() => expect(document.documentElement.dataset.font).toBe('serif'))

    fireEvent.click(screen.getByRole('radio', { name: 'Large' }))
    await waitFor(() => expect(document.documentElement.dataset.size).toBe('lg'))
  })

  it('turns reduced motion on and off with a switch', async () => {
    signedIn()
    mockFetch({ ...base, 'PUT /api/user/preferences': (req) => json({ ...DEFAULT_PREFS, ...req.body }) })
    renderAt('/app/settings?tab=appearance')
    const sw = await screen.findByRole('switch', { name: /reduce motion/i })
    fireEvent.click(sw)
    await waitFor(() => expect(document.documentElement.dataset.motion).toBe('reduce'))
    expect(sw).toHaveAttribute('aria-checked', 'true')
  })

  it('keeps the chosen theme on the device when signed out', async () => {
    mockFetch({})
    renderAt('/login')
    const toggle = await screen.findByRole('button', { name: /theme:/i })
    fireEvent.click(toggle) // system -> light... cycle until dark
    fireEvent.click(toggle)
    fireEvent.click(toggle)
    expect(JSON.parse(localStorage.getItem('sr_prefs')).theme).toBeDefined()
  })
})

describe('Settings → Profile and security', () => {
  it('saves profile changes', async () => {
    signedIn()
    const calls = mockFetch({ ...base, 'PUT /api/user': (req) => json({ ...me, ...req.body }) })
    renderAt('/app/settings?tab=profile')
    const name = await screen.findByLabelText('Full name')
    fireEvent.change(name, { target: { value: 'Aarav S.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT' && c.path === '/api/user')?.body).toMatchObject({ name: 'Aarav S.' }))
  })

  it('refuses mismatched new passwords before calling the server', async () => {
    signedIn()
    const calls = mockFetch(base)
    renderAt('/app/settings?tab=security')
    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'correct-horse-battery-1' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'another-password-2' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different-password-3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))
    expect(await screen.findByText('The two passwords don’t match.')).toBeInTheDocument()
    expect(calls.some((c) => c.path === '/api/user/password')).toBe(false)
  })
})

/* ---------------------------------------------------------- navigation */
describe('Navigation', () => {
  it('shows a not-found page for unknown routes', async () => {
    signedIn()
    mockFetch(base)
    renderAt('/app/nope')
    expect(await screen.findByText('We couldn’t find that page')).toBeInTheDocument()
  })

  it('has a skip link and marks the current section', async () => {
    signedIn()
    mockFetch(base)
    renderAt('/app/applications')
    await screen.findByRole('heading', { name: 'Applications' })
    expect(screen.getByRole('link', { name: /skip to content/i })).toBeInTheDocument()
    const active = screen.getAllByRole('link', { name: /applications/i }).find((a) => a.getAttribute('aria-current') === 'page')
    expect(active).toBeTruthy()
  })
})

/* -------------------------------------------------------------- helpers */
describe('Preferences helpers', () => {
  it('normalises partial preferences and applies data attributes', () => {
    expect(normalise({ theme: 'dark' })).toEqual({ ...DEFAULT_PREFS, theme: 'dark' })
    applyPrefs({ theme: 'dark', font: 'serif', text_size: 'xl', reduce_motion: true })
    expect(document.documentElement.dataset).toMatchObject({ theme: 'dark', font: 'serif', size: 'xl', motion: 'reduce' })
    applyPrefs({ theme: 'light' })
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})

// Keep the fixtures referenced so they stay in sync with the API contract.
describe('Fixtures', () => {
  it('match the API shapes the UI depends on', () => {
    expect(Array.isArray(jobs)).toBe(true)
    expect(job.description).toBeTypeOf('string')
    expect(history.items).toBeDefined()
    expect(matches[0]).toHaveProperty('status')
  })
})

describe('Preferences on sign-in', () => {
  it('keeps a theme chosen on the device when an account still has defaults', async () => {
    localStorage.setItem('sr_prefs', JSON.stringify({ ...DEFAULT_PREFS, theme: 'dark' }))
    const calls = mockFetch({
      'POST /api/auth/login': { token: 't', user: { ...me, preferences: DEFAULT_PREFS } },
      'PUT /api/user/preferences': (req) => json({ ...DEFAULT_PREFS, ...req.body }),
      ...base,
    })
    renderAt('/login')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'aarav@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-battery-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(calls.find((c) => c.method === 'PUT' && c.path === '/api/user/preferences')?.body).toMatchObject({ theme: 'dark' })
  })
})
