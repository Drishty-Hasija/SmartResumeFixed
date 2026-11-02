import { useCallback, useState } from 'react'
import { ApiError } from '../services/api'

export const ACCEPTED = ['pdf', 'docx', 'txt']
export const MAX_MB = 10

/** Client-side checks that mirror the server, so obvious mistakes fail instantly. */
export function validateFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!ACCEPTED.includes(ext)) {
    return { message: `Unsupported file type${ext ? ` (.${ext})` : ''}.`, hint: 'Upload a PDF, DOCX or TXT file.' }
  }
  if (file.size === 0) return { message: 'This file is empty.', hint: 'Choose a different file.' }
  if (file.size > MAX_MB * 1024 * 1024) {
    return { message: `This file is larger than ${MAX_MB} MB.`, hint: 'Export a smaller version and try again.' }
  }
  return null
}

/**
 * Upload state machine: idle → uploading (real progress) → processing (server analysing) → complete | error.
 * `send(file, onProgress)` is the API call to make, so the same hook serves resumes and job descriptions.
 */
export function useUpload(send) {
  const [state, setState] = useState({ status: 'idle', progress: 0, fileName: '', error: null, result: null })

  const reset = useCallback(() => setState({ status: 'idle', progress: 0, fileName: '', error: null, result: null }), [])

  const start = useCallback(async (file) => {
    const problem = validateFile(file)
    if (problem) {
      setState({ status: 'error', progress: 0, fileName: file.name, error: new ApiError(problem.message, { hint: problem.hint }), result: null })
      return null
    }
    setState({ status: 'uploading', progress: 0, fileName: file.name, error: null, result: null })
    try {
      const result = await send(file, (progress) => {
        setState((s) => ({ ...s, progress, status: progress >= 100 ? 'processing' : 'uploading' }))
      })
      setState({ status: 'complete', progress: 100, fileName: file.name, error: null, result })
      return result
    } catch (error) {
      setState({ status: 'error', progress: 0, fileName: file.name, error, result: null })
      return null
    }
  }, [send])

  return { ...state, start, reset }
}
