import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Trash2 } from 'lucide-react'
import Button, { Card, CardHeader, Textarea } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { JobMatchReport } from '../components/domain'
import { ConfirmDialog, ErrorState, PageSkeleton, useToast } from '../components/feedback'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../services/api'
import { formatDateTime } from '../utils/format'
import { STATUS_OPTIONS, StatusSelect } from './Applications'

export default function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: match, error, loading, reload } = useAsync(() => api.match(id), [id])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  usePageTitle(match ? match.job_title : 'Application')

  useEffect(() => { if (match) setNotes(match.notes || '') }, [match])

  if (loading && !match) return <PageSkeleton rows={2} />
  if (error) return (
    <>
      <Button to="/app/applications" variant="ghost" icon={ArrowLeft} className="-ml-3 mb-4">Back to applications</Button>
      <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
    </>
  )

  const update = async (changes, success) => {
    setSaving(true)
    try { await api.updateMatch(id, changes); if (success) toast.success(success); await reload() }
    catch (err) { toast.error('Couldn’t save', err.message) }
    finally { setSaving(false) }
  }

  const remove = async () => {
    setSaving(true)
    try { await api.deleteMatch(id); toast.success('Application removed'); navigate('/app/applications', { replace: true }) }
    catch (err) { toast.error('Couldn’t delete', err.message); setSaving(false) }
  }

  const dirty = notes !== (match.notes || '')

  return (
    <>
      <Link to="/app/applications" className="t-small mb-4 -ml-1 inline-flex items-center gap-1.5 text-ink-muted hover:text-ink"><ArrowLeft size={14} aria-hidden />All applications</Link>
      <PageHeader stackActions eyebrow={`Compared ${formatDateTime(match.created_at)}`} title={match.job_title}
        description={<>Against <Link to={`/app/resumes/${match.resume_id}`} className="font-medium text-accent hover:underline">{match.resume_filename}</Link></>}
        actions={<>
          <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>Export</Button>
          <Button variant="ghost" size="sm" icon={Trash2} aria-label="Delete application" onClick={() => setDeleting(true)} className="hover:text-danger" />
        </>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Stage" description="Move this application along as things change." />
          <StatusSelect id="detail-status" value={match.status} disabled={saving}
            onChange={(s) => update({ status: s }, `Moved to ${STATUS_OPTIONS.find((o) => o.value === s)?.label.toLowerCase()}`)} />
          <div className="mt-6">
            <label htmlFor="notes" className="mb-1.5 block text-[0.875rem] font-medium">Notes</label>
            <Textarea id="notes" rows={7} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Recruiter name, interview dates, what to highlight next time…" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="t-small text-ink-muted">{notes.length.toLocaleString()} / 5,000</span>
              <Button size="sm" disabled={!dirty} loading={saving} onClick={() => update({ notes }, 'Notes saved')}>Save notes</Button>
            </div>
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <p className="t-label mb-2 text-ink-muted">Links</p>
            <div className="flex flex-col gap-2 text-[0.875rem]">
              <Link to={`/app/resumes/${match.resume_id}`} className="text-accent hover:underline">Open resume report</Link>
              <Link to={`/app/compare?resume=${match.resume_id}&job=${match.job_id}`} className="text-accent hover:underline">Run this comparison again</Link>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <JobMatchReport match={match} />
        </div>
      </div>

      <ConfirmDialog open={deleting} busy={saving} onClose={() => setDeleting(false)} onConfirm={remove}
        title="Remove this application?" confirmLabel="Remove" description="The comparison and your notes will be deleted. The resume and job description are kept." />
    </>
  )
}
