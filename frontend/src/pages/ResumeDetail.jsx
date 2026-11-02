import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Download, Pencil, Printer, RefreshCw, Target, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Button, { Card, CardHeader, Field, Input, Modal, Badge } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { ResumeReport } from '../components/domain'
import { ConfirmDialog, EmptyState, ErrorState, PageSkeleton, useToast } from '../components/feedback'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../services/api'
import { formatBytes, formatDate } from '../utils/format'
import { APP_STATUS } from './Applications'

export default function ResumeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: resume, error, loading, reload } = useAsync(() => api.resume(id), [id])
  const [renaming, setRenaming] = useState(false)
  const [label, setLabel] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  usePageTitle(resume ? (resume.label || resume.filename) : 'Resume')

  if (loading && !resume) return <PageSkeleton rows={3} />
  if (error) return (
    <>
      <Button to="/app/resumes" variant="ghost" icon={ArrowLeft} className="-ml-3 mb-4">Back to resumes</Button>
      <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
    </>
  )

  const act = async (fn, success) => {
    setBusy(true)
    try { await fn(); if (success) toast.success(success); await reload() }
    catch (e) { toast.error('Something went wrong', e.message) }
    finally { setBusy(false) }
  }

  const saveName = () => act(async () => {
    await api.renameResume(id, label.trim() || null)
    setRenaming(false)
  }, 'Resume renamed')

  const remove = async () => {
    setBusy(true)
    try {
      await api.deleteResume(id)
      toast.success('Resume deleted')
      navigate('/app/resumes', { replace: true })
    } catch (e) { toast.error('Couldn’t delete', e.message); setBusy(false) }
  }

  return (
    <>
      <Link to="/app/resumes" className="t-small mb-4 -ml-1 inline-flex items-center gap-1.5 text-ink-muted hover:text-ink"><ArrowLeft size={14} aria-hidden />All resumes</Link>
      <PageHeader stackActions eyebrow={`Resume · ${resume.file_type.toUpperCase()} · ${formatBytes(resume.file_size)}`}
        title={resume.label || resume.filename}
        description={resume.label ? `${resume.filename} · uploaded ${formatDate(resume.uploaded_at)}` : `Uploaded ${formatDate(resume.uploaded_at)}`}
        actions={<>
          <Button variant="secondary" size="sm" icon={Pencil} onClick={() => { setLabel(resume.label || ''); setRenaming(true) }}>Rename</Button>
          <Button variant="secondary" size="sm" icon={Download} onClick={() => api.downloadResume(id, resume.filename).catch((e) => toast.error('Download failed', e.message))}>Original</Button>
          <Button variant="secondary" size="sm" icon={RefreshCw} loading={busy} onClick={() => act(() => api.reanalyze(id), 'Analysis updated')}>Re-analyse</Button>
          <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>Export</Button>
          <Button size="sm" icon={Target} to={`/app/compare?resume=${id}`}>Compare with a job</Button>
          <Button variant="ghost" size="sm" icon={Trash2} aria-label="Delete resume" onClick={() => setDeleting(true)} className="text-danger hover:text-danger" />
        </>} />

      {resume.analysis ? <ResumeReport resume={resume} /> : (
        <EmptyState title="This resume hasn’t been analysed yet" action={<Button onClick={() => act(() => api.reanalyze(id))} loading={busy} icon={RefreshCw}>Analyse now</Button>}>
          Run the analysis to see the score, sections and skills.
        </EmptyState>
      )}

      <Card className="mt-6">
        <CardHeader title="Job comparisons" description="Each time this resume was compared with a job description."
          action={<Button to={`/app/compare?resume=${id}`} variant="ghost" size="sm">New comparison</Button>} />
        {resume.matches.length === 0 ? (
          <p className="text-ink-muted">No comparisons yet. Compare this resume with a job to see which skills you are missing.</p>
        ) : (
          <ul className="divide-y divide-line">
            {resume.matches.map((m) => (
              <li key={m.id}>
                <Link to={`/app/applications/${m.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.job_title}</span>
                    <span className="t-small text-ink-muted">{formatDate(m.created_at)} · {m.matching_skill_count} skills matched · {m.missing_skill_count} missing</span>
                  </span>
                  <Badge tone="accent">{Math.round(m.match_score)}% match</Badge>
                  <Badge>{APP_STATUS[m.status]?.label || m.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={renaming} onClose={() => setRenaming(false)} title="Rename resume"
        footer={<><Button variant="secondary" onClick={() => setRenaming(false)}>Cancel</Button><Button loading={busy} onClick={saveName}>Save</Button></>}>
        <Field id="rename" label="Name" optional hint="Leave blank to show the file name.">
          <Input id="rename" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} autoFocus />
        </Field>
      </Modal>

      <ConfirmDialog open={deleting} busy={busy} onClose={() => setDeleting(false)} onConfirm={remove}
        title="Delete this resume?" confirmLabel="Delete resume"
        description="Its report, job comparisons and the uploaded file will be permanently removed." />
    </>
  )
}
