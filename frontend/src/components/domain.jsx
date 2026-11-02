import { Check, Info, Minus, TriangleAlert } from 'lucide-react'
import { Badge, CardHeader, Card, ProgressBar } from './ui'
import { cx, formatDateTime, PRIORITY } from '../utils/format'

/* -------------------------------------------------------------- score ring */
export function ScoreRing({ value, size = 128, label, sublabel, className }) {
  const r = 46
  const c = 2 * Math.PI * r
  const v = value == null ? 0 : Math.max(0, Math.min(100, value))
  return (
    <div className={cx('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}
      role="img" aria-label={value == null ? `${label}: not available` : `${label}: ${Math.round(v)} out of 100${sublabel ? `, ${sublabel}` : ''}`}>
      <svg viewBox="0 0 100 100" className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" style={{ stroke: 'rgb(var(--line))' }} strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" style={{ stroke: 'rgb(var(--accent))' }} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[1.75rem] font-semibold leading-none tracking-tight">{value == null ? '—' : Math.round(v)}</span>
        {sublabel && <span className="mt-1 text-[0.6875rem] uppercase tracking-wide text-ink-muted">{sublabel}</span>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ chips */
export function Chips({ items, empty, render, className }) {
  if (!items?.length) return empty ? <p className="text-ink-muted">{empty}</p> : null
  return <ul className={cx('flex flex-wrap gap-1.5', className)}>{items.map((item, i) => <li key={typeof item === 'string' ? item : item.name ?? i}>{render(item)}</li>)}</ul>
}

export function Chip({ tone = 'default', children, title }) {
  const cls = { default: 'chip', success: 'chip chip-success', accent: 'chip chip-accent', danger: 'chip chip-danger', warning: 'chip chip-warning' }[tone]
  return <span className={cls} title={title}>{children}</span>
}

/* ----------------------------------------------------------- breakdowns */
export function ScoreBreakdown({ breakdown }) {
  const rows = Object.values(breakdown || {})
  return (
    <ul className="space-y-4">
      {rows.map((c) => (
        <li key={c.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="font-medium">{c.label}</span>
            {c.applicable
              ? <span className="mono text-ink-soft">{Math.round(c.score)}<span className="text-ink-muted"> / 100</span></span>
              : <span className="t-small text-ink-muted">Not applicable</span>}
          </div>
          <ProgressBar value={c.applicable ? c.score : 0} muted={!c.applicable} label={`${c.label} score`} />
          {c.detail && <p className="t-small mt-1.5 text-ink-muted">{c.detail}</p>}
        </li>
      ))}
    </ul>
  )
}

export function SectionChecklist({ sections }) {
  return (
    <ul className="divide-y divide-line">
      {(sections || []).map((s) => {
        const present = s.status === 'present'
        const optional = s.status === 'optional_missing'
        const Icon = present ? Check : optional ? Minus : TriangleAlert
        return (
          <li key={s.key} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
              present ? 'bg-success-soft text-success' : optional ? 'bg-surface-soft text-ink-muted' : 'bg-warning-soft text-warning')}>
              <Icon size={12} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3">
                <span className="font-medium">{s.label}</span>
                <span className={cx('t-small', present ? 'text-success' : optional ? 'text-ink-muted' : 'text-warning')}>
                  {present ? 'Found' : optional ? 'Optional' : 'Missing'}
                </span>
              </div>
              {!present && s.note && <p className="t-small mt-0.5 text-ink-muted">{s.note}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function Suggestions({ items, empty = 'Nothing stands out. Your resume covers the basics well.' }) {
  if (!items?.length) return <p className="text-ink-muted">{empty}</p>
  return (
    <ol className="space-y-4">
      {items.map((s, i) => {
        const p = PRIORITY[s.priority] || PRIORITY.low
        return (
          <li key={`${s.title}-${i}`} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[0.75rem] font-semibold text-ink-soft" aria-hidden>{i + 1}</span>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{s.title}</h3>
                <Badge tone={s.priority === 'high' ? 'danger' : s.priority === 'medium' ? 'warning' : 'neutral'}>{p.label}</Badge>
              </div>
              <p className="text-ink-soft">{s.message}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* -------------------------------------------------------- resume report */
export function ResumeReport({ resume }) {
  const a = resume.analysis
  const skills = a.skills
  const categories = Object.entries(skills.by_category || {})
  const facts = a.entities || {}
  const contact = facts.contact || {}
  const edu = facts.education || {}

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <ScoreRing value={a.score} label="Resume score" sublabel="of 100" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-1">Resume score</p>
            <p className="t-h3">{a.score_label}</p>
            <p className="t-small mt-2 max-w-prose text-ink-muted">
              Based on how complete and specific your resume is: sections, skills, measurable results and contact details.
              It is a guide to improving the document, not a prediction of whether you will be hired.
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Fact label="Words" value={a.stats.word_count} />
              <Fact label="Skills found" value={a.stats.skill_count} />
              <Fact label="Sections" value={`${a.stats.section_count ?? a.sections?.filter((s) => s.status === 'present').length ?? 0} found`} />
              <Fact label="Uploaded" value={formatDateTime(resume.uploaded_at)} />
            </dl>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Score breakdown" description="Each part is worth a share of the total score. Parts that don’t apply to you are left out." />
          <ScoreBreakdown breakdown={a.score_breakdown} />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Sections" description="The headings a recruiter expects to find." />
          <SectionChecklist sections={a.sections} />
        </Card>
      </div>

      <Card>
        <CardHeader title="Skills" description={`${skills.total} skills detected across ${categories.length} categories`} />
        {skills.total === 0 ? (
          <p className="text-ink-muted">No skills were recognised. Add a Skills section that lists your tools and languages by name.</p>
        ) : (
          <div className="space-y-4">
            {categories.map(([cat, names]) => (
              <div key={cat}>
                <p className="t-label mb-2 flex items-center gap-2 text-ink-muted">{cat}<span className="mono">{names.length}</span></p>
                <Chips items={names} render={(n) => <Chip tone="success">{n}</Chip>} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Key terms" description="Words that appear most often in your resume." />
          {(a.keywords || []).length === 0 ? <p className="text-ink-muted">Not enough text to pick out key terms.</p> : (
            <Chips items={(a.keywords || []).slice(0, 18).map((k) => k.keyword)} render={(k) => <Chip>{k}</Chip>} />
          )}
        </Card>
        <Card>
          <CardHeader title="Details we found" description="Check these are correct. Fix the source file and re-analyse if not." />
          <dl className="divide-y divide-line">
            <FactRow label="Name" value={facts.name} />
            <FactRow label="Email" value={contact.email} />
            <FactRow label="Phone" value={contact.phone} />
            <FactRow label="Links" value={[contact.linkedin, contact.github, contact.website].filter(Boolean).join('  ·  ') || null} />
            <FactRow label="Education" value={[...(edu.degrees || []), ...(edu.institutions || [])].join(', ') || null} />
            <FactRow label="Experience" value={facts.estimated_experience_years != null ? `About ${facts.estimated_experience_years} year(s) of dated roles` : null} />
          </dl>
        </Card>
      </div>

      <Card>
        <CardHeader title="How to improve" description="Ordered by impact. Each one is based on something specific in this resume." />
        <Suggestions items={a.suggestions} />
      </Card>
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="t-label text-ink-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value ?? '—'}</dd>
    </div>
  )
}

function FactRow({ label, value }) {
  return (
    <div className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[120px_1fr] sm:gap-4">
      <dt className="t-label pt-0.5 text-ink-muted">{label}</dt>
      <dd className={cx('min-w-0 break-words', !value && 'text-ink-muted')}>{value || 'Not found'}</dd>
    </div>
  )
}

/* ----------------------------------------------------------- job match */
const WEIGHT_KEY = { skill_match: 'skills', text_similarity: 'text', keyword_overlap: 'keywords' }
const PART_LABEL = { skill_match: 'Skills', text_similarity: 'Wording', keyword_overlap: 'Keywords' }
const PART_HELP = {
  skill_match: 'Required skills count fully; nice-to-have skills count half.',
  text_similarity: 'How closely the wording of your resume matches the posting.',
  keyword_overlap: 'Share of the posting’s important terms that your resume also uses.',
}

export function JobMatchReport({ match }) {
  const d = match.details || {}
  const c = d.components || {}
  const weights = c.weights || {}
  const required = (match.missing_skills || []).filter((s) => s.importance === 'required')
  const preferred = (match.missing_skills || []).filter((s) => s.importance === 'preferred')
  const total = match.matching_skills.length + match.missing_skills.length

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <ScoreRing value={match.match_score} label="Job match" sublabel="match" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-1">Job match</p>
            <p className="t-h3">{d.verdict || match.verdict}</p>
            {total > 0 && <p className="mt-2 text-ink-soft">{match.matching_skills.length} of {total} skills from the posting appear in your resume.</p>}
            <ul className="mt-5 space-y-3">
              {['skill_match', 'text_similarity', 'keyword_overlap'].map((key) => (
                <li key={key}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-[0.875rem]">
                    <span className="font-medium">{PART_LABEL[key]}</span>
                    <span className="mono text-ink-soft">
                      {c[key] == null ? 'Not enough data' : `${Math.round(c[key])}%`}
                      {c[key] != null && weights[WEIGHT_KEY[key]] != null && (
                        <span className="text-ink-muted"> · weight {Math.round(weights[WEIGHT_KEY[key]] * 100)}%</span>
                      )}
                    </span>
                  </div>
                  <ProgressBar value={c[key] ?? 0} tone="accent" label={PART_LABEL[key]} muted={c[key] == null} />
                  <p className="t-small mt-1 text-ink-muted">{PART_HELP[key]}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Skills you have" description={`${match.matching_skills.length} found in both`} />
          <Chips items={match.matching_skills} empty="No skills from the posting were found in your resume."
            render={(s) => <Chip tone="success" title={s.importance === 'preferred' ? 'Nice to have' : 'Required'}>{s.name}{s.importance === 'preferred' ? ' · nice to have' : ''}</Chip>} />
        </Card>
        <Card>
          <CardHeader title="Skills to add" description="Asked for in the posting but not found in your resume." />
          {match.missing_skills.length === 0 ? (
            <p className="flex items-center gap-2 text-success"><Check size={16} aria-hidden />Nothing missing. Every skill in the posting appears in your resume.</p>
          ) : (
            <div className="space-y-4">
              {required.length > 0 && <div><p className="t-label mb-2 text-ink-muted">Required</p><Chips items={required} render={(s) => <Chip tone="danger">{s.name}</Chip>} /></div>}
              {preferred.length > 0 && <div><p className="t-label mb-2 text-ink-muted">Nice to have</p><Chips items={preferred} render={(s) => <Chip tone="warning">{s.name}</Chip>} /></div>}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Shared keywords" description="Important terms in both documents." />
          <Chips items={match.matching_keywords} empty="No shared keywords found." render={(k) => <Chip tone="accent">{k}</Chip>} />
        </Card>
        <Card>
          <CardHeader title="Keywords to consider" description="Use them only where they honestly describe your experience." />
          <Chips items={match.missing_keywords} empty="None. Your resume covers the posting’s key terms." render={(k) => <Chip>{k}</Chip>} />
        </Card>
      </div>

      {d.experience_check?.required_years ? (
        <Card>
          <CardHeader title="Experience" />
          <p className="text-ink-soft">
            The posting asks for {d.experience_check.required_years}+ year(s). Your resume shows{' '}
            {d.experience_check.resume_years_mentioned != null ? `about ${d.experience_check.resume_years_mentioned} year(s)` : 'no dated experience'}.
          </p>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Next steps" description="Based on the gaps above." />
        <Suggestions items={d.suggestions} empty="Your resume lines up well with this posting." />
      </Card>

      <p className="t-small flex gap-2 text-ink-muted"><Info size={14} className="mt-0.5 shrink-0" aria-hidden />
        {d.disclaimer || 'This compares the text of your resume with the job posting. It does not predict hiring decisions.'}</p>
    </div>
  )
}

