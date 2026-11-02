/**
 * The only place that talks to the backend. Every request carries the session token;
 * an expired or revoked session dispatches "sr:session-expired" so the app can sign out cleanly.
 */
const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'sr_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => (token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY)),
}

export class ApiError extends Error {
  constructor(message, { status = 0, code, hint, details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.hint = hint
    this.details = details
  }

  /** Map a server "field" error to the matching form field, e.g. { email: 'Enter a valid…' }. */
  fieldErrors() {
    return Object.fromEntries((this.details || []).map((d) => [d.field, d.message]))
  }
}

const AUTH_PATHS = ['/api/auth/login', '/api/auth/register']

function authHeaders(extra = {}) {
  const token = tokenStore.get()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

async function toApiError(res) {
  let body = {}
  try { body = (await res.json()).error || {} } catch { /* not JSON */ }
  if (res.status === 401 && !AUTH_PATHS.some((p) => (res.url || '').endsWith(p))) {
    window.dispatchEvent(new Event('sr:session-expired'))
  }
  return new ApiError(body.message || 'Something went wrong. Please try again.', {
    status: res.status, code: body.code, hint: body.hint, details: body.details,
  })
}

async function request(path, { method = 'GET', body, raw = false } = {}) {
  const init = { method, headers: authHeaders() }
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  let res
  try {
    res = await fetch(BASE + path, init)
  } catch {
    throw new ApiError("We can’t reach the SmartResume server right now. Check that it is running, then try again.", { code: 'network' })
  }
  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return null
  return raw ? res : res.json()
}

/** Upload with real progress (XHR exposes upload progress; fetch does not). */
function upload(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', BASE + path)
    const token = tokenStore.get()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)) }
    xhr.onerror = () => reject(new ApiError("We can’t reach the SmartResume server right now.", { code: 'network' }))
    xhr.onload = () => {
      let data = null
      try { data = JSON.parse(xhr.responseText) } catch { /* empty body */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data)
      if (xhr.status === 401) window.dispatchEvent(new Event('sr:session-expired'))
      reject(new ApiError(data?.error?.message || 'Upload failed. Please try again.', {
        status: xhr.status, code: data?.error?.code, hint: data?.error?.hint, details: data?.error?.details,
      }))
    }
    xhr.send(formData)
  })
}

/** Download an authenticated file (the token cannot go in a plain link) and save it. */
export async function downloadFile(path, fallbackName) {
  const res = await request(path, { raw: true })
  const blob = await res.blob()
  const match = /filename="?([^";]+)"?/i.exec(res.headers.get('content-disposition') || '')
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: match?.[1] || fallbackName })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const q = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null && v !== false))
  return s.toString() ? `?${s}` : ''
}

export const api = {
  // auth
  register: (name, email, password) => request('/api/auth/register', { method: 'POST', body: { name, email, password } }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  // account
  updateProfile: (payload) => request('/api/user', { method: 'PUT', body: payload }),
  changePassword: (current_password, new_password) =>
    request('/api/user/password', { method: 'PUT', body: { current_password, new_password } }),
  updatePreferences: (changes) => request('/api/user/preferences', { method: 'PUT', body: changes }),
  deleteAccount: (password) => request('/api/user', { method: 'DELETE', body: { password } }),

  // dashboard + history
  dashboard: () => request('/api/dashboard'),
  history: (params) => request(`/api/history${q(params)}`),
  skills: () => request('/api/skills'),
  loadSample: () => request('/api/samples/load', { method: 'POST' }),
  health: () => request('/api/health'),

  // resumes
  resumes: () => request('/api/resumes'),
  resume: (id) => request(`/api/resumes/${id}`),
  renameResume: (id, label) => request(`/api/resumes/${id}`, { method: 'PATCH', body: { label } }),
  reanalyze: (id) => request(`/api/resumes/${id}/analyze`, { method: 'POST' }),
  deleteResume: (id) => request(`/api/resumes/${id}`, { method: 'DELETE' }),
  downloadResume: (id, name) => downloadFile(`/api/resumes/${id}/file`, name),
  uploadResume: (file, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return upload('/api/resumes/upload', fd, onProgress)
  },

  // jobs
  jobs: () => request('/api/jobs'),
  job: (id) => request(`/api/jobs/${id}`),
  createJob: (title, description) => request('/api/jobs', { method: 'POST', body: { title: title || null, description } }),
  uploadJob: (file, title, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    if (title) fd.append('title', title)
    return upload('/api/jobs/upload', fd, onProgress)
  },
  renameJob: (id, title) => request(`/api/jobs/${id}`, { method: 'PATCH', body: { title } }),
  deleteJob: (id) => request(`/api/jobs/${id}`, { method: 'DELETE' }),

  // matches / applications
  matches: (resumeId) => request(`/api/match${q({ resume_id: resumeId })}`),
  match: (id) => request(`/api/match/${id}`),
  compare: (resume_id, job_id) => request('/api/match', { method: 'POST', body: { resume_id, job_id } }),
  updateMatch: (id, changes) => request(`/api/match/${id}`, { method: 'PATCH', body: changes }),
  deleteMatch: (id) => request(`/api/match/${id}`, { method: 'DELETE' }),
}

export const isNetworkError = (e) => e instanceof ApiError && e.code === 'network'
