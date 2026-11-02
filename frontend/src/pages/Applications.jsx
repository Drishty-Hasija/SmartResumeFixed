import { useMemo, useState } from 'react'
import { ChevronRight, ClipboardList, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button, { Card, Select } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, PageSkeleton, useToast } from '../components/feedback'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../services/api'
import { cx, formatDate } from '../utils/format'

/** Application stages, in the order a candidate moves through them. */
export const APP_STATUS = {
  saved: { label: 'Saved', tone: 'neutral' },
  applied: { label: 'Applied', tone: 'accent' },
  interviewing: { label: 'Interviewing', tone: 'warning' },
  offer: { label: 'Offer', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
}
export const STATUS_OPTIONS = Object.entries(APP_STATUS).map(([value, v]) => ({ value, label: v.label }))

export function StatusSelect({ value, onChange, id, disabled }) {
  return (
    <Select id={id} aria-label="Application status" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-9 w-40 text-[0.875rem]">
      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  )
}

export default function Applications() {
  usePageTitle('Applications')
  const toast = useToast()
  const list = useAsync(() => api.matches(), [])
  const [filter, setFilter] = useState('all')
  const [pending, setPending] = useState(null)

  const counts = useMemo(() => {
    const c = { all: 0 }
    for (const k of Object.keys(APP_STATUS)) c[k] = 0
    for (const m of list.data || []) { c.all += 1; c[m.status] = (c[m.status] || 0) + 1 }
    return c
  }, [list.data])

  if (list.loading && !list.data) return <PageSkeleton rows={2} />
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />

  const rows = (list.data || []).filter((m) => filter === 'all' || m.status === filter)

  const changeStatus = async (m, status) => {
    setPending(m.id)
    try {
      await api.updateMatch(m.id, { status })
      toast.success(`Moved to ${APP_STATUS[status].label.toLowerCase()}`, m.job_title)
      list.reload()
    } catch (err) { toast.error('Couldn’t update', err.message) }
    finally { setPending(null) }
  }

  return (
    <>
      <PageHeader eyebrow="Tracker" title="Applications"
        description="Every comparison you’ve run, with the stage it’s at. Change a status here, and add notes on the application page."
        actions={<Button to="/app/compare" icon={Target}>Compare a job</Button>} />

      {list.data.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No applications yet"
          action={<Button to="/app/compare" icon={Target}>Compare a resume with a job</Button>}>
          Once you compare a resume with a job, it appears here so you can track it through to an offer.
        </EmptyState>
      ) : (
        <>
          <div role="tablist" aria-label="Filter by status" className="mb-5 flex flex-wrap gap-2">
            {[['all', 'All'], ...Object.entries(APP_STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                className={cx('h-8 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors',
                  filter === k ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink')}>
                {label} <span className="ml-1 opacity-70">{counts[k] ?? 0}</span>
              </button>
            ))}
          </div>

          {rows.length === 0 ? <p className="py-10 text-center text-ink-muted">Nothing at this stage yet.</p> : (
            <Card padded={false}>
              <ul className="divide-y divide-line">
                {rows.map((m) => (
                  <li key={m.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:gap-5 md:px-6">
                    <Link to={`/app/applications/${m.id}`} className="group flex min-w-0 flex-1 items-center gap-4">
                      <span className="w-14 shrink-0 text-center">
                        <span className="mono block text-[1.125rem] font-semibold text-ink">{Math.round(m.match_score)}%</span>
                        <span className="t-label text-ink-muted">match</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium group-hover:underline">{m.job_title}</span>
                        <span className="t-small block truncate text-ink-muted">{m.resume_filename} · {m.verdict} · {formatDate(m.created_at)}</span>
                      </span>
                      <ChevronRight size={16} className="ml-auto shrink-0 text-ink-muted md:hidden" aria-hidden />
                    </Link>
                    <div className="flex items-center gap-2 md:shrink-0">
                      <StatusSelect id={`status-${m.id}`} value={m.status} disabled={pending === m.id} onChange={(s) => changeStatus(m, s)} />
                      <Button to={`/app/applications/${m.id}`} variant="ghost" size="sm" className="hidden md:inline-flex">Open</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  )
}
