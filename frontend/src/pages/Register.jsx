import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button, { Field, Input } from '../components/ui'
import { useSession } from '../context/session'
import { usePageTitle } from '../hooks/usePageTitle'
import { ApiError } from '../services/api'

export default function Register() {
  usePageTitle('Create account')
  const { signUp } = useSession()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const local = {}
    if (!form.name.trim()) local.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) local.email = 'Enter a valid email address.'
    if (form.password.length < 8) local.password = 'Use at least 8 characters.'
    if (Object.keys(local).length) return setErrors(local)

    setBusy(true); setErrors({})
    try {
      await signUp(form.name.trim(), form.email.trim(), form.password)
      navigate('/app', { replace: true })
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors() : {}
      setErrors({ ...fe, form: err.message })
      setBusy(false)
    }
  }

  return (
    <div className="card p-6 md:p-8">
      <h1 className="t-h2">Create your account</h1>
      <p className="t-small mt-2 text-ink-muted">Save your resumes, job descriptions and applications in one place.</p>

      <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
        {errors.form && <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-[0.875rem] text-danger">{errors.form}</div>}
        <Field id="name" label="Full name" error={errors.name}>
          <Input id="name" autoComplete="name" value={form.name} onChange={set('name')} error={!!errors.name} maxLength={120} />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={!!errors.email} />
        </Field>
        <Field id="password" label="Password" error={errors.password} hint={!errors.password ? 'At least 8 characters.' : null}>
          <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={!!errors.password} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Create account</Button>
      </form>

      <p className="t-small mt-6 text-center text-ink-muted">
        Already have an account? <Link to="/login" className="font-medium text-accent underline underline-offset-4">Sign in</Link>
      </p>
    </div>
  )
}
