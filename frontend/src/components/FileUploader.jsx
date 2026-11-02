import { useRef, useState } from 'react'
import { Check, FileText, Upload } from 'lucide-react'
import { cx } from '../utils/format'
import { ACCEPTED, MAX_MB } from '../hooks/useUpload'
import Button, { ProgressBar } from './ui'
import { ErrorState } from './feedback'

/** Drag-and-drop file picker with honest states: idle, uploading (real %), processing, complete, error. */
export default function FileUploader({
  status = 'idle', progress = 0, fileName, error, onSelect, onReset,
  title = 'Drop your file here', description, accept = ACCEPTED, compact = false, completeTitle = 'Done', children,
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const pick = (files) => { const f = files?.[0]; if (f) onSelect?.(f) }
  const pad = compact ? 'px-5 py-8' : 'px-6 py-14 md:py-16'

  if (status === 'error') {
    return (
      <div className="space-y-4">
        <ErrorState error={error} title={error?.message || 'We couldn’t read this file.'} />
        <Button variant="secondary" icon={Upload} onClick={onReset}>Choose another file</Button>
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className={cx('panel-soft text-center', pad)} aria-busy="true">
        <p className="mono mb-4 inline-flex items-center gap-2 text-ink-soft"><FileText size={14} aria-hidden />{fileName}</p>
        {status === 'uploading' ? (
          <div className="mx-auto w-full max-w-sm text-left">
            <div className="mb-2 flex justify-between text-[0.875rem]"><span className="font-medium">Uploading</span><span className="mono text-ink-muted">{progress}%</span></div>
            <ProgressBar value={progress} tone="accent" label="Upload progress" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden />
            <p className="font-medium">Reading your file</p>
            <p className="t-small text-ink-muted">This usually takes a few seconds.</p>
          </div>
        )}
      </div>
    )
  }

  if (status === 'complete') {
    return (
      <div className={cx('rounded-lg border border-success/30 bg-success-soft text-center', compact ? 'px-5 py-8' : 'px-6 py-12')} role="status">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-success text-white"><Check size={20} aria-hidden /></span>
        <p className="t-h4">{completeTitle}</p>
        <p className="mono mt-1 text-ink-soft">{fileName}</p>
        {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    )
  }

  return (
    <label
      htmlFor="file-input"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files) }}
      className={cx(
        'group block cursor-pointer rounded-lg border-2 border-dashed text-center transition-colors duration-150 focus-within:shadow-focus',
        dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:border-accent/60 hover:bg-accent-soft/50', pad,
      )}
    >
      <input id="file-input" ref={inputRef} type="file" className="sr-only"
        accept={accept.map((e) => `.${e}`).join(',')} onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
      <span className={cx('mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-colors', dragging ? 'bg-accent text-on-accent' : 'bg-surface-soft text-ink-soft group-hover:text-accent')}>
        <Upload size={20} aria-hidden />
      </span>
      <p className="t-h4">{dragging ? 'Release to upload' : title}</p>
      {description && <p className="t-small mx-auto mt-1.5 max-w-sm text-ink-muted">{description}</p>}
      <p className="mt-4 text-[0.875rem] text-ink-soft">
        Drag a file here, or <span className="font-medium text-accent underline underline-offset-4">browse</span>
      </p>
      <p className="mono mt-3 text-ink-muted">{accept.map((e) => e.toUpperCase()).join(' · ')} · up to {MAX_MB} MB</p>
    </label>
  )
}
