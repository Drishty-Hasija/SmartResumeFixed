import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, WifiOff, X } from 'lucide-react'
import Button, { Modal } from './ui'
import { cx } from '../utils/format'
import { ApiError, isNetworkError } from '../services/api'

/* ---------------------------------------------------------------- toasts */
const ToastContext = createContext(null)
const TONE = {
  success: { icon: CheckCircle2, cls: 'text-success' },
  error: { icon: AlertTriangle, cls: 'text-danger' },
  info: { icon: Info, cls: 'text-accent' },
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const seq = useRef(0)
  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const push = useCallback((t) => {
    const id = ++seq.current
    setItems((xs) => [...xs.slice(-2), { id, tone: 'info', ...t }])
    setTimeout(() => dismiss(id), t.tone === 'error' ? 6500 : 4000)
  }, [dismiss])
  const value = useMemo(() => ({
    push,
    success: (title, description) => push({ tone: 'success', title, description }),
    error: (title, description) => push({ tone: 'error', title, description }),
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div data-toast-region aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6">
        {items.map((t) => {
          const { icon: Icon, cls } = TONE[t.tone] || TONE.info
          return (
            <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto animate-pop flex w-full max-w-sm items-start gap-3 rounded-lg border border-line bg-surface p-4 shadow-menu">
              <Icon size={18} className={cn(cls, 'mt-0.5 shrink-0')} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title}</p>
                {t.description && <p className="t-small mt-0.5 text-ink-soft">{t.description}</p>}
              </div>
              <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="btn btn-ghost btn-sm -m-1 h-7 w-7 p-0">
                <X size={14} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

const cn = cx
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/* ----------------------------------------------------------- state views */
export function Skeleton({ className }) {
  return <div className={cx('skeleton h-4', className)} aria-hidden />
}

export function PageSkeleton({ rows = 3 }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="card space-y-4 p-6"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /></div>
        ))}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action, secondary }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {Icon && <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-ink-soft"><Icon size={22} aria-hidden /></span>}
      <h2 className="t-h4">{title}</h2>
      {children && <p className="t-small mx-auto mt-2 max-w-md text-ink-muted">{children}</p>}
      {(action || secondary) && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}{secondary}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, compact = false, title }) {
  const network = isNetworkError(error)
  const message = title || error?.message || 'Something went wrong. Please try again.'
  const hint = network ? 'Check that the backend is running on port 8000, then retry.' : error instanceof ApiError ? error.hint : null
  return (
    <div role="alert" className={cx('flex gap-3 rounded-lg border border-danger/30 bg-danger-soft', compact ? 'p-4' : 'p-5')}>
      {network ? <WifiOff size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden /> : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-danger">{message}</p>
        {hint && <p className="t-small mt-1 text-ink-soft">{hint}</p>}
        {onRetry && <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', tone = 'danger', busy = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
      </>} />
  )
}
