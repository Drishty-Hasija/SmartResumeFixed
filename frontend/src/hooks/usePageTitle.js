import { useEffect } from 'react'

/** Sets the browser tab title, e.g. "Resumes · SmartResume". */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · SmartResume` : 'SmartResume'
  }, [title])
}
