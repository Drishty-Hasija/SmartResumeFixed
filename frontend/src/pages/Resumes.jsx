import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, FileText, Pencil, Search, Trash2, Upload } from 'lucide-react'
import Button, { Card, Field, Input, Modal } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { ConfirmDialog, EmptyState, ErrorState, PageSkeleton, useToast } from '../components/feedback'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../services/api'
import { formatBytes, formatDate } from '../utils/format'

function RenameDialog({ resume, onClose, onSaved }) {
  const toast = useToast()
  const [label, setLabel] = useState(resume?.label || '')
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e?.preventDefault()
    setBusy(true)
    try {
      await api.renameResume(resume.id, label.trim() || null)
      toast.success('Resume renamed')
      onSaved()
    } catch (err) {
      toast.error('Couldn’t rename', err.message)
    } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title="Rename resume" description={`Shown instead of “${resume.filename}”. Leave blank to use the file name.`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save name</Button></>}>
      <form onSubmit={save}>
        <Field id="label" label="Name" optional>
          <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} placeholder="e.g. Data analyst, summer 2026" autoFocus />
        </Field>
      </form>
    </Modal>
  )
}

export default function Resumes() {
  usePageTitle('Resumes')
  const navigate = useNavigate()
  const toast = useToast()
  const list = useAsync(() => api.resumes(), [])
  const [query, setQuery] = useState('')
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (list.data || []).filter((r) => !q || `${r.label || ''} ${r.filename}`.toLowerCase().includes(q))
  }, [list.data, query])

  if (list.loading && !list.data) return <PageSkeleton rows={2} />
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />

  const remove = async () => {
    setBusy(true)
    try {
      await api.deleteResume(deleting.id)
      toast.success('Resume deleted', 'Its analysis, matches and file were removed.')
      setDeleting(null)
      list.reload()
    } catch (err) {
      toast.error('Couldn’t delete', err.message)
    } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader eyebrow="Library" title="Resumes" description="Every resume you have uploaded. Open one for its full report, or download the original file."
        actions={<Button to="/app/resumes/new" icon={Upload}>Upload resume</Button>} />

      {list.data.length === 0 ? (
        <EmptyState icon={FileText} title="No resumes yet" action={<Button to="/app/resumes/new" icon={Upload}>Upload resume</Button>}
          secondary={<Button variant="secondary" onClick={async () => { const r = await api.loadSample(); navigate(`/app/resumes/${r.resume_id}`) }}>Use a sample</Button>}>
          Upload a PDF, Word or text file to get started.
        </EmptyState>
      ) : (
        <>
          <div className="relative mb-4 max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
            <Input type="search" aria-label="Search resumes" placeholder="Search by name" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {rows.length === 0 ? <p className="py-10 text-center text-ink-muted">No resumes match “{query}”.</p> : (
            <Card padded={false}>
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:gap-4 md:px-6">
                    <Link to={`/app/resumes/${r.id}`} className="flex min-w-0 flex-1 items-center gap-4 rounded-md outline-none hover:opacity-90">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-ink-soft"><FileText size={18} aria-hidden /></span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.label || r.filename}</span>
                        <span className="t-small block truncate text-ink-muted">
                          {r.label ? `${r.filename} · ` : ''}{r.file_type.toUpperCase()} · {formatBytes(r.file_size)} · {formatDate(r.uploaded_at)}
                        </span>
                      </span>
                    </Link>
                    <div className="flex items-center gap-5 pl-14 md:pl-0">
                      <span className="w-20 text-right">
                        {r.score == null ? <span className="t-small text-ink-muted">Not analysed</span> : <>
                          <span className="mono font-medium">{Math.round(r.score)}</span><span className="t-small text-ink-muted"> /100</span></>}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" aria-label={`Download ${r.filename}`} title="Download original"
                          onClick={() => api.downloadResume(r.id, r.filename).catch((e) => toast.error('Download failed', e.message))}><Download size={15} aria-hidden /></Button>
                        <Button variant="ghost" size="sm" aria-label={`Rename ${r.filename}`} title="Rename" onClick={() => setRenaming(r)}><Pencil size={15} aria-hidden /></Button>
                        <Button variant="ghost" size="sm" aria-label={`Delete ${r.filename}`} title="Delete" onClick={() => setDeleting(r)} className="hover:text-danger"><Trash2 size={15} aria-hidden /></Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {renaming && <RenameDialog resume={renaming} onClose={() => setRenaming(null)} onSaved={() => { setRenaming(null); list.reload() }} />}
      <ConfirmDialog open={!!deleting} busy={busy} onClose={() => setDeleting(null)} onConfirm={remove}
        title="Delete this resume?" confirmLabel="Delete resume"
        description={deleting ? `“${deleting.label || deleting.filename}”, its analysis, its job matches and the uploaded file will be permanently removed.` : ''} />
    </>
  )
}
