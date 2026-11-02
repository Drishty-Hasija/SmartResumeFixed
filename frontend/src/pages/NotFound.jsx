import { Compass } from 'lucide-react'
import Button from '../components/ui'
import { EmptyState } from '../components/feedback'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Page not found')
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-5 py-16">
      <EmptyState icon={Compass} title="We couldn’t find that page" action={<Button to="/app">Go to overview</Button>}>
        The link may be old, or the page may have moved.
      </EmptyState>
    </div>
  )
}
