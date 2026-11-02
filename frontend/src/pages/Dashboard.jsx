import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Briefcase, ClipboardList, FileText, Target, Upload } from 'lucide-react'
import Button, { Card, CardHeader } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { Chip, Chips, ScoreRing } from '../components/domain'
import { EmptyState, ErrorState, PageSkeleton } from '../components/feedback'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSession } from '../context/session'
import { api } from '../services/api'
import { formatDate, round } from '../utils/format'

const STATUSES = [
  ['saved', 'Saved'], ['applied', 'Applied'], ['interviewing', 'Interviewing'], ['offer', 'Offer'], ['rejected', 'Rejected'],
]

function Stat({ icon: Icon, label, value, to }) {
  const body = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-soft text-ink-soft"><Icon size={17} aria-hidden /></span>
      <span className="mt-4 block text-[1.75rem] font-semibold leading-none tracking-tight">{value}</span>
      <span className="t-small mt-1.5 block text-ink-muted">{label}</span>
    </>
  )
  return to ? (
    <Link to={to} className="card block p-5 transition-colors hover:border-line-strong">{body}</Link>
  ) : (
    <div className="card p-5">{body}</div>
  )
}

export default function Dashboard() {
  usePageTitle('Overview')
  const { user } = useSession()
  const navigate = useNavigate()
  const dash = useAsync(() => api.dashboard(), [])
  const apps = useAsync(() => api.matches(), [])

  if (dash.loading && !dash.data) return <PageSkeleton rows={2} />
  if (dash.error) return <ErrorState error={dash.error} onRetry={dash.reload} />

  const { totals, latest_resume: resume, latest_analysis: analysis, top_skills: skills, recent } = dash.data
  const first = (user?.name || 'there').split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  if (!resume) {
    return (
      <>
        <PageHeader eyebrow="Overview" title={`${greeting}, ${first}`} description="Start with your resume. It only takes a minute." />
        <EmptyState icon={Upload} title="Upload your first resume"
          action={<Button to="/app/resumes/new" icon={Upload}>Upload resume</Button>}
          secondary={<Button variant="secondary" loading={false} onClick={async () => {
            const r = await api.loadSample(); navigate(`/app/resumes/${r.resume_id}`)
          }}>Try a sample resume</Button>}>
          You’ll get a score, a breakdown by section, the skills we found, and steps to improve.
        </EmptyState>
      </>
    )
  }

  const counts = Object.fromEntries(STATUSES.map(([k]) => [k, 0]))
  for (const a of apps.data || []) counts[a.status] = (counts[a.status] || 0) + 1
  const totalApps = (apps.data || []).length

  return (
    <>
      <PageHeader eyebrow="Overview" title={`${greeting}, ${first}`}
        description="A summary of your resumes, the jobs you’re considering, and where each application stands."
        actions={<>
          <Button to="/app/compare" variant="secondary" icon={Target}>Compare with a job</Button>
          <Button to="/app/resumes/new" icon={Upload}>Upload resume</Button>
        </>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={FileText} label="Resumes" value={totals.resumes} to="/app/resumes" />
        <Stat icon={Briefcase} label="Job descriptions" value={totals.jobs} to="/app/jobs" />
        <Stat icon={ClipboardList} label="Applications" value={totalApps} to="/app/applications" />
        <Stat icon={Target} label="Average resume score" value={round(totals.average_score)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader eyebrow="Latest resume" title={resume.label || resume.filename} description={`Uploaded ${formatDate(resume.uploaded_at)}`}
            action={<Button to={`/app/resumes/${resume.id}`} variant="ghost" size="sm">Open report<ArrowRight size={14} aria-hidden /></Button>} />
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <ScoreRing value={analysis?.score} label="Resume score" sublabel="of 100" size={112} />
            <div className="min-w-0 flex-1">
              <p className="t-h4">{analysis?.score_label || 'Not analysed yet'}</p>
              <p className="t-small mt-1 text-ink-muted">{skills?.length ? `${resume.skill_count ?? skills.length} skills detected` : 'No skills detected yet'}</p>
              <div className="mt-4">
                <Chips items={skills} render={(s) => <Chip tone="success">{s.name}</Chip>} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader eyebrow="Pipeline" title="Applications" description={totalApps ? `${totalApps} in total` : 'Compare a resume with a job to start tracking.'} />
          <ul className="space-y-3">
            {STATUSES.map(([key, label]) => {
              const n = counts[key] || 0
              const pct = totalApps ? Math.round((n / totalApps) * 100) : 0
              return (
                <li key={key} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[0.8125rem] text-ink-soft">{label}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-soft" aria-hidden>
                    <span className="block h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="mono w-6 text-right text-ink-muted">{n}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <Card className="mt-6" padded={false}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4 md:px-6">
          <h2 className="t-h4">Recent resumes</h2>
          <Link to="/app/resumes" className="t-small font-medium text-accent hover:underline">View all</Link>
        </div>
        <ul className="divide-y divide-line">
          {recent.map((r) => (
            <li key={r.resume_id}>
              <Link to={`/app/resumes/${r.resume_id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-soft md:px-6">
                <FileText size={17} className="shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.filename}</span>
                  <span className="t-small text-ink-muted">{formatDate(r.date)}{r.match_job_title ? ` · ${r.match_job_title}` : ''}</span>
                </span>
                <span className="mono text-ink-soft">{r.score == null ? '—' : `${Math.round(r.score)}/100`}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
