import { useCallback, useState } from 'react'
import { Briefcase, FileUp, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import Button, { Card, Field, Input, Modal, Segmented, Textarea } from '../components/ui'
import PageHeader from '../components/PageHeader'
import FileUploader from '../components/FileUploader'
import { ConfirmDialog, EmptyState, ErrorState, PageSkeleton, useToast } from '../components/feedback'
import { useAsync } from '../hooks/useAsync'
import { useUpload } from '../hooks/useUpload'
import { usePageTitle } from '../hooks/usePageTitle'
import { api, ApiError } from '../services/api'
import { formatDate } from '../utils/format'

const MAX = 30000

function AddJobDialog({ open, onClose, onSaved }) {
  const toast = useToast()
  const [mode, setMode] = useState('paste')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const sendFile = useCallback((file, onProgress) => api.uploadJob(file, title.trim(), onProgress), [title])
  const up = useUpload(sendFile)

  const savePaste = async (e) => {
    e.preventDefault()
    if (!text.trim()) return setErrors({ text: 'Paste the job posting first.' })
    if (text.length > MAX) return setErrors({ text: `This is longer than ${MAX.toLocaleString()} characters.` })
    setBusy(true); setErrors({})
    try {
      await api.createJob(title.trim(), text)
      toast.success('Job description saved')
      onSaved()
    } catch (err) {
      setErrors(err instanceof ApiError ? { ...err.fieldErrors(), text: err.fieldErrors().description || err.message } : { text: err.message })
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Add a job description" description="Paste the posting or upload it as a file. You can compare it with any resume afterwards."
      footer={mode === 'paste' ? <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="paste-job" loading={busy}>Save job</Button></> : <Button variant="secondary" onClick={onClose}>Close</Button>}>
      <Segmented label="How to add" value={mode} onChange={setMode} options={[{ value: 'paste', label: 'Paste text' }, { value: 'upload', label: 'Upload file' }]} />
      <div className="mt-5">
        {mode === 'paste' ? (
          <form id="paste-job" onSubmit={savePaste} className="space-y-5" noValidate>
            <Field id="job-title" label="Job title" optional>
              <Input id="job-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Junior Data Analyst, Acme Ltd" />
            </Field>
            <Field id="job-text" label="Job posting" error={errors.text} hint={!errors.text ? `${text.length.toLocaleString()} / ${MAX.toLocaleString()} characters` : null}>
              <Textarea id="job-text" rows={12} value={text} onChange={(e) => setText(e.target.value)} error={!!errors.text} placeholder="Paste the full posting, including requirements and nice-to-have skills." />
            </Field>
          </form>
        ) : (
          <div className="space-y-5">
            <Field id="job-title-upload" label="Job title" optional>
              <Input id="job-title-upload" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </Field>
            <FileUploader {...up} onSelect={async (f) => { const r = await up.start(f); if (r) { toast.success('Job description saved'); onSaved() } }}
              onReset={up.reset} accept={['pdf', 'docx', 'txt']} compact completeTitle="Saved" title="Drop a job posting file" />
          </div>
        )}
      </div>
    </Modal>
  )
}

function RenameJob({ job, onClose, onSaved }) {
  const toast = useToast()
  const [title, setTitle] = useState(job.title)
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try { await api.renameJob(job.id, title.trim()); toast.success('Renamed'); onSaved() }
    catch (err) { toast.error('Couldn’t rename', err.message) }
    finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title="Rename job description"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="rename-job" loading={busy}>Save</Button></>}>
      <form id="rename-job" onSubmit={save}>
        <Field id="rename-job-title" label="Title">
          <Input id="rename-job-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus required />
        </Field>
      </form>
    </Modal>
  )
}

export default function Jobs() {
  usePageTitle('Job descriptions')
  const toast = useToast()
  const jobs = useAsync(() => api.jobs(), [])
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  if (jobs.loading && !jobs.data) return <PageSkeleton rows={2} />
  if (jobs.error) return <ErrorState error={jobs.error} onRetry={jobs.reload} />

  const remove = async () => {
    setBusy(true)
    try { await api.deleteJob(deleting.id); toast.success('Job description deleted'); setDeleting(null); jobs.reload() }
    catch (err) { toast.error('Couldn’t delete', err.message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader eyebrow="Library" title="Job descriptions"
        description="Postings you are interested in. Compare any of them with your resume to see the gaps."
        actions={<Button icon={Plus} onClick={() => setAdding(true)}>Add job</Button>} />

      {jobs.data.length === 0 ? (
        <EmptyState icon={Briefcase} title="No job descriptions yet" action={<Button icon={Plus} onClick={() => setAdding(true)}>Add a job</Button>}>
          Paste or upload a posting. We’ll keep it here so you can compare it with any resume.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.data.map((j) => (
            <Card key={j.id} className="flex flex-col">
              <div className="min-w-0 flex-1">
                <p className="t-h4 truncate" title={j.title}>{j.title}</p>
                <p className="t-small mt-1 text-ink-muted">{formatDate(j.created_at)} · {j.word_count} words{j.source_filename ? ` · ${j.source_filename}` : ''}</p>
                <p className="mt-3 line-clamp-3 text-ink-soft">{j.preview}</p>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <Button to={`/app/compare?job=${j.id}`} size="sm" icon={Target}>Compare</Button>
                <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setRenaming(j)}>Rename</Button>
                <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleting(j)} className="ml-auto hover:text-danger" aria-label={`Delete ${j.title}`}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddJobDialog open={adding} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); jobs.reload() }} />
      {renaming && <RenameJob job={renaming} onClose={() => setRenaming(null)} onSaved={() => { setRenaming(null); jobs.reload() }} />}
      <ConfirmDialog open={!!deleting} busy={busy} onClose={() => setDeleting(null)} onConfirm={remove}
        title="Delete this job description?" confirmLabel="Delete"
        description={deleting ? `“${deleting.title}” and any comparisons made with it will be removed.` : ''} />
    </>
  )
}
