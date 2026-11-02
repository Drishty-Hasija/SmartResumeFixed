import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui'
import { Field, Input } from '../components/ui'
import { useSession } from '../context/session'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Login() {
  usePageTitle('Sign in')
  const { signIn } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/app'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="card p-6 md:p-8">
      <h1 className="t-h2">Sign in</h1>
      <p className="t-small mt-2 text-ink-muted">Welcome back. Pick up where you left off.</p>

      <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
        {error && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-[0.875rem] text-danger">{error}</div>
        )}
        <Field id="email" label="Email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={!!error} />
        </Field>
        <Field id="password" label="Password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={!!error} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
      </form>

      <p className="t-small mt-6 text-center text-ink-muted">
        New to SmartResume? <Link to="/register" className="font-medium text-accent underline underline-offset-4">Create an account</Link>
      </p>
    </div>
  )
}
