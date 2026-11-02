import { forwardRef, useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { cx } from '../utils/format'

export function Spinner({ className }) {
  return <span aria-hidden className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />
}

// Class names are written out in full so Tailwind's scanner keeps them (dynamic `btn-${x}` would be purged).
const VARIANT = { primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost', danger: 'btn-danger' }

export default function Button({ to, href, variant = 'primary', size = 'md', icon: Icon, loading = false, className, children, disabled, ...rest }) {
  const cls = cx('btn', size === 'lg' && 'btn-lg', size === 'sm' && 'btn-sm', VARIANT[variant] || VARIANT.primary, className)
  const content = (
    <>
      {loading ? <Spinner /> : Icon ? <Icon size={size === 'sm' ? 14 : 16} aria-hidden strokeWidth={2} /> : null}
      {children}
    </>
  )
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>
  if (href) return <a href={href} className={cls} {...rest}>{content}</a>
  return (
    <button type="button" className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  )
}

export function Card({ as: Tag = 'section', padded = true, className, children, ...rest }) {
  return <Tag className={cx('card', padded && 'p-5 md:p-6', className)} {...rest}>{children}</Tag>
}

export function CardHeader({ eyebrow, title, description, action, className }) {
  return (
    <div className={cx('mb-5 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        {title && <h2 className="t-h4 break-words">{title}</h2>}
        {description && <p className="t-small mt-1 text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

const TONES = { neutral: 'badge-neutral', success: 'badge-success', warning: 'badge-warning', danger: 'badge-danger', accent: 'badge-accent' }
export function Badge({ tone = 'neutral', icon: Icon, children, className }) {
  return (
    <span className={cx('badge', TONES[tone], className)}>
      {Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  )
}

export function Field({ id, label, hint, error, optional, className, children }) {
  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-[0.875rem] font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="font-normal text-ink-muted">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.8125rem] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ error, className, ...rest }, ref) {
  return (
    <input ref={ref} aria-invalid={error ? true : undefined} className={cx('input', error && 'input-error', className)} {...rest} />
  )
})

export const Textarea = forwardRef(function Textarea({ error, className, ...rest }, ref) {
  return <textarea ref={ref} aria-invalid={error ? true : undefined} className={cx('input', error && 'input-error', className)} {...rest} />
})

export function Select({ error, className, children, ...rest }) {
  return (
    <select aria-invalid={error ? true : undefined} className={cx('input pr-8', error && 'input-error', className)} {...rest}>
      {children}
    </select>
  )
}

/** Radio-group style choice (theme, font, size). */
export function Segmented({ label, value, options, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-surface-soft p-1">
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cx(
              'h-8 rounded px-3 text-[0.8125rem] font-medium transition-colors duration-150 disabled:opacity-50',
              on ? 'bg-surface text-ink shadow-[0_0_0_1px_rgb(var(--line-strong))]' : 'text-ink-soft hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Tabs({ label, value, onChange, tabs }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const on = value === t.value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`tab-${t.value}`}
            aria-selected={on}
            aria-controls={`panel-${t.value}`}
            onClick={() => onChange(t.value)}
            className={cx(
              '-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[0.875rem] font-medium transition-colors',
              on ? 'border-accent text-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {t.icon && <t.icon size={16} aria-hidden />}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export function ProgressBar({ value = 0, label, tone = 'ink', muted = false }) {
  const color = { ink: 'bg-ink', accent: 'bg-accent', success: 'bg-success', warning: 'bg-warning' }[tone] || 'bg-ink'
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-soft ring-1 ring-inset ring-line">
      <div className={cx('h-full rounded-full transition-[width] duration-700 ease-out', muted ? 'bg-line-strong' : color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Modal({ open, onClose, title, description, footer, children, size = 'md' }) {
  const panel = useRef(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const first = panel.current?.querySelector('input, select, textarea, button:not([data-close])')
    ;(first || panel.current)?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll('a[href], button:not([disabled]), input, select, textarea')]
        if (!items.length) return
        const [a, b] = [items[0], items[items.length - 1]]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus() }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={cx('animate-pop flex max-h-[92vh] w-full flex-col rounded-t-xl border border-line bg-surface shadow-modal focus:outline-none sm:rounded-xl',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="t-h4">{title}</h2>
            {description && <p className="t-small mt-1 text-ink-muted">{description}</p>}
          </div>
          <button type="button" data-close onClick={onClose} aria-label="Close" className="btn btn-ghost btn-sm -mr-2 h-8 w-8 p-0 shrink-0">
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 md:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 md:px-6">{footer}</div>}
      </div>
    </div>
  )
}

export const SectionTitle = ({ id, children }) => <h2 id={id} className="t-h4 mb-3">{children}</h2>
export const Divider = ({ className }) => <div className={cx('border-t border-line', className)} role="separator" />
