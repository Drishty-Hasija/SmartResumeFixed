import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogOut, Palette, Shield, User, Database } from 'lucide-react'
import Button, { Card, CardHeader, Field, Input, Modal, Segmented, Tabs } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/feedback'
import { useSession } from '../context/session'
import { usePageTitle } from '../hooks/usePageTitle'
import { FONT_OPTIONS, SIZE_OPTIONS, THEME_OPTIONS } from '../lib/prefs'
import { api, ApiError } from '../services/api'
import { cx, formatDate } from '../utils/format'

const TABS = [
  { value: 'profile', label: 'Profile', icon: User },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'appearance', label: 'Appearance', icon: Palette },
  { value: 'data', label: 'Data', icon: Database },
]

/* -------------------------------------------------------------- profile */
function ProfileTab() {
  const { user, updateProfile } = useSession()
  const toast = useToast()
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const dirty = form.name !== user?.name || form.email !== user?.email
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setErrors({})
    try {
      await updateProfile({ name: form.name.trim(), email: form.email.trim() })
      toast.success('Profile updated')
    } catch (err) {
      setErrors(err instanceof ApiError ? { ...err.fieldErrors(), form: err.code === 'email_taken' ? err.message : undefined } : { form: err.message })
    } finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader title="Profile" description={user?.created_at ? `Member since ${formatDate(user.created_at)}` : 'Your name and sign-in email.'} />
      <form onSubmit={save} className="grid max-w-xl gap-5" noValidate>
        {errors.form && <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-[0.875rem] text-danger">{errors.form}</div>}
        <Field id="p-name" label="Full name" error={errors.name}>
          <Input id="p-name" autoComplete="name" value={form.name} onChange={set('name')} error={!!errors.name} maxLength={120} />
        </Field>
        <Field id="p-email" label="Email" error={errors.email} hint={!errors.email ? 'Used to sign in.' : null}>
          <Input id="p-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={!!errors.email} />
        </Field>
        <div>
          <Button type="submit" loading={busy} disabled={!dirty}>Save changes</Button>
        </div>
      </form>
    </Card>
  )
}

/* ------------------------------------------------------------- security */
function SecurityTab() {
  const { changePassword, signOut } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    const local = {}
    if (form.next.length < 8) local.next = 'Use at least 8 characters.'
    if (form.confirm !== form.next) local.confirm = 'The two passwords don’t match.'
    if (Object.keys(local).length) return setErrors(local)
    setBusy(true); setErrors({})
    try {
      await changePassword(form.current, form.next)
      setForm({ current: '', next: '', confirm: '' })
      toast.success('Password changed', 'You’ve been signed out of your other devices.')
    } catch (err) {
      setErrors({ current: err.code === 'wrong_password' ? err.message : undefined, form: err.code === 'wrong_password' ? undefined : err.message, next: err.code === 'same_password' ? err.message : undefined })
    } finally { setBusy(false) }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader title="Change password" description="Choose something you don’t use elsewhere. Changing it signs out every other device." />
        <form onSubmit={save} className="grid max-w-xl gap-5" noValidate>
          {errors.form && <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-[0.875rem] text-danger">{errors.form}</div>}
          <Field id="pw-current" label="Current password" error={errors.current}>
            <Input id="pw-current" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} error={!!errors.current} />
          </Field>
          <Field id="pw-new" label="New password" error={errors.next} hint={!errors.next ? 'At least 8 characters.' : null}>
            <Input id="pw-new" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} error={!!errors.next} />
          </Field>
          <Field id="pw-confirm" label="Confirm new password" error={errors.confirm}>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={!!errors.confirm} />
          </Field>
          <div><Button type="submit" loading={busy}>Update password</Button></div>
        </form>
      </Card>

      <Card>
        <CardHeader title="This device" description="End your session here. You’ll need to sign in again to use SmartResume." />
        <Button variant="secondary" icon={LogOut} onClick={async () => { await signOut(); navigate('/login', { replace: true }) }}>Sign out</Button>
      </Card>
    </div>
  )
}

/* ----------------------------------------------------------- appearance */
function Switch({ id, checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <label htmlFor={id} className="font-medium">{label}</label>
        {description && <p className="t-small mt-0.5 text-ink-muted">{description}</p>}
      </div>
      <button id={id} role="switch" aria-checked={checked} type="button" onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line-strong')}>
        <span className={cx('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200', checked && 'translate-x-5')} />
      </button>
    </div>
  )
}

function AppearanceTab() {
  const { prefs, updatePrefs, resetPrefs } = useSession()
  const toast = useToast()
  const save = (changes) => updatePrefs(changes).catch((e) => toast.error('Couldn’t save', e.message))

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Theme" description="System follows your device’s light or dark setting." />
          <Segmented label="Theme" value={prefs.theme} options={THEME_OPTIONS} onChange={(v) => save({ theme: v })} />
        </Card>

        <Card>
          <CardHeader title="Font" description="Applies across the whole app." />
          <Segmented label="Font" value={prefs.font} options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))} onChange={(v) => save({ font: v })} />
          <p className="t-small mt-3 text-ink-muted">{FONT_OPTIONS.find((f) => f.value === prefs.font)?.hint}</p>
        </Card>

        <Card>
          <CardHeader title="Text size" description="Scales all text and spacing." />
          <Segmented label="Text size" value={prefs.text_size} options={SIZE_OPTIONS} onChange={(v) => save({ text_size: v })} />
        </Card>

        <Card>
          <div className="space-y-5">
            <Switch id="reduce-motion" label="Reduce motion" description="Turn off transitions and animations."
              checked={prefs.reduce_motion} onChange={(v) => save({ reduce_motion: v })} />
          </div>
        </Card>

        <div>
          <Button variant="ghost" size="sm" onClick={() => resetPrefs().then(() => toast.success('Appearance reset to defaults')).catch((e) => toast.error('Couldn’t reset', e.message))}>
            Reset to defaults
          </Button>
        </div>
      </div>

      <aside aria-label="Preview" className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <p className="eyebrow mb-3">Preview</p>
          <p className="t-h4">Senior Data Analyst</p>
          <p className="mt-2 text-ink-soft">
            Built dashboards that cut weekly reporting from two days to two hours, and led a team of three through a move to SQL-based pipelines.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip chip-success">Python</span>
            <span className="chip">SQL</span>
            <span className="chip">Tableau</span>
          </div>
        </Card>
      </aside>
    </div>
  )
}

/* ----------------------------------------------------------------- data */
function DataTab() {
  const toast = useToast()
  const navigate = useNavigate()
  const { deleteAccount } = useSession()
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const sample = async () => {
    try { const r = await api.loadSample(); toast.success('Sample data added'); navigate(`/app/resumes/${r.resume_id}`) }
    catch (e) { toast.error('Couldn’t load sample', e.message) }
  }

  const remove = async (e) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try { await deleteAccount(password); navigate('/', { replace: true }) }
    catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader title="Sample data" description="Adds a sample resume and job description, so you can explore every feature." />
        <Button variant="secondary" onClick={sample}>Add sample data</Button>
      </Card>

      <Card className="border-danger/40">
        <CardHeader title="Delete account" description="Permanently removes your account, resumes, job descriptions, applications, notes and uploaded files. This cannot be undone." />
        <Button variant="danger" onClick={() => setConfirming(true)}>Delete my account</Button>
      </Card>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Delete your account?"
        description="Everything you’ve saved will be removed for good. Enter your password to confirm."
        footer={<>
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>Keep my account</Button>
          <Button variant="danger" type="submit" form="delete-account" loading={busy} disabled={!password}>Delete account</Button>
        </>}>
        <form id="delete-account" onSubmit={remove} className="space-y-4" noValidate>
          {error && <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-[0.875rem] text-danger">{error}</div>}
          <Field id="del-password" label="Password">
            <Input id="del-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={!!error} />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

/* ----------------------------------------------------------------- page */
export default function Settings() {
  usePageTitle('Settings')
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'profile'
  const setTab = (v) => setParams({ tab: v }, { replace: true })

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Your profile, sign-in, and how SmartResume looks and reads on your screen." />
      <Tabs label="Settings sections" value={tab} onChange={setTab} tabs={TABS} />
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'appearance' && <AppearanceTab />}
        {tab === 'data' && <DataTab />}
      </div>
    </>
  )
}
