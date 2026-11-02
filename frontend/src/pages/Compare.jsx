import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Target } from 'lucide-react'
import Button, { Card, Field, Select } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { JobMatchReport } from '../components/domain'
import { EmptyState, ErrorState, PageSkeleton, useToast } from '../components/feedback'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../services/api'

export default function Compare() {
  usePageTitle('Compare')
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const resumes = useAsync(() => api.resumes(), [])
  const jobs = useAsync(() => api.jobs(), [])
  const [resumeId, setResumeId] = useState(params.get('resume') || '')
  const [jobId, setJobId] = useState(params.get('job') || '')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const resultRef = useRef(null)

  // Sensible defaults: the newest resume and job, once the lists load
  useEffect(() => { if (!resumeId && resumes.data?.length) setResumeId(String(resumes.data[0].id)) }, [resumes.data, resumeId])
  useEffect(() => { if (!jobId && jobs.data?.length) setJobId(String(jobs.data[0].id)) }, [jobs.data, jobId])

  const selectedJob = useMemo(() => (jobs.data || []).find((j) => String(j.id) === jobId), [jobs.data, jobId])

  if ((resumes.loading && !resumes.data) || (jobs.loading && !jobs.data)) return <PageSkeleton rows={2} />
  if (resumes.error || jobs.error) return <ErrorState error={resumes.error || jobs.error} onRetry={() => { resumes.reload(); jobs.reload() }} />

  if (!resumes.data.length || !jobs.data.length) {
    return (
      <>
        <PageHeader eyebrow="Tracker" title="Compare a resume with a job" />
        <EmptyState icon={Target}
          title={!resumes.data.length ? 'Upload a resume first' : 'Add a job description first'}
          action={<Button to={!resumes.data.length ? '/app/resumes/new' : '/app/jobs'}>{!resumes.data.length ? 'Upload resume' : 'Add a job'}</Button>}>
          A comparison needs one resume and one job description.
        </EmptyState>
      </>
    )
  }

  const run = async (e) => {
    e?.preventDefault()
    setRunning(true); setResult(null)
    try {
      const m = await api.compare(Number(resumeId), Number(jobId))
      setResult(m)
      setParams({ resume: resumeId, job: jobId })
      setTimeout(() => resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 60)
      toast.success('Comparison ready', 'It’s been saved to your applications.')
    } catch (err) {
      toast.error('Couldn’t compare', err.message)
    } finally { setRunning(false) }
  }

  return (
    <>
      <PageHeader eyebrow="Tracker" title="Compare a resume with a job"
        description="Choose a resume and a job description. You’ll see which required and nice-to-have skills you already show, and which are missing." />

      <Card>
        <form onSubmit={run} className="grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field id="cmp-resume" label="Resume">
            <Select id="cmp-resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)} disabled={running}>
              {resumes.data.map((r) => <option key={r.id} value={r.id}>{r.label || r.filename}</option>)}
            </Select>
          </Field>
          <Field id="cmp-job" label="Job description" hint={selectedJob ? `${selectedJob.word_count} words · ${selectedJob.skill_count} skills detected` : null}>
            <Select id="cmp-job" value={jobId} onChange={(e) => setJobId(e.target.value)} disabled={running}>
              {jobs.data.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </Select>
          </Field>
          <Button type="submit" size="lg" icon={Target} loading={running} disabled={!resumeId || !jobId}>Compare</Button>
        </form>
      </Card>

      {running && <div className="card mt-8 flex items-center gap-3 p-6 text-ink-soft"><span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden />Comparing the two documents…</div>}

      {result && !running && (
        <section ref={resultRef} className="mt-10 scroll-mt-24" aria-labelledby="cmp-result">
          <div className="mb-6 flex flex-col gap-3 border-t border-line pt-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow mb-1">Result</p>
              <h2 id="cmp-result" className="t-h3">{result.job_title}</h2>
              <p className="mt-1 text-ink-muted">compared with {result.resume_filename}</p>
            </div>
            <Button to={`/app/applications/${result.id}`} variant="secondary" icon={ArrowRight}>Open application</Button>
          </div>
          <JobMatchReport match={result} />
          <p className="t-small mt-6 text-ink-muted">Saved as an application. <Link to="/app/applications" className="text-accent hover:underline">Track it in Applications</Link>.</p>
        </section>
      )}
    </>
  )
}
