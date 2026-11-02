import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSearch, Target } from 'lucide-react'
import Button, { Card } from '../components/ui'
import FileUploader from '../components/FileUploader'
import PageHeader from '../components/PageHeader'
import { useUpload } from '../hooks/useUpload'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../services/api'

export default function UploadResume() {
  usePageTitle('Upload resume')
  const navigate = useNavigate()
  const send = useCallback((file, onProgress) => api.uploadResume(file, onProgress), [])
  const up = useUpload(send)
  const id = up.result?.id

  return (
    <>
      <PageHeader eyebrow="Resumes" title="Upload a resume"
        description="We read the text, check the sections, find your skills and score the document. Your original file is kept so you can download it at any time." />
      <div className="mx-auto max-w-2xl">
        <Card>
          <FileUploader {...up} onSelect={up.start} onReset={up.reset} completeTitle="Resume uploaded"
            title="Drop your resume here"
            description="Scanned images can’t be read. If your file is a scan, export a text-based PDF first.">
            <Button to={`/app/resumes/${id}`} icon={FileSearch}>View report</Button>
            <Button to={`/app/compare?resume=${id}`} variant="secondary" icon={Target}>Compare with a job</Button>
            <Button variant="ghost" onClick={up.reset}>Upload another</Button>
          </FileUploader>

          {up.status === 'idle' && (
            <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
              <p className="t-small text-ink-muted">Don’t have a resume to hand? Try the app with a sample.</p>
              <Button variant="secondary" size="sm" onClick={async () => {
                const r = await api.loadSample(); navigate(`/app/resumes/${r.resume_id}`)
              }}>Load sample resume</Button>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
