import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import AuthShell from './layouts/AuthShell'
import { useSession } from './context/session'
import Applications from './pages/Applications'
import ApplicationDetail from './pages/ApplicationDetail'
import Compare from './pages/Compare'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Landing from './pages/Landing'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import ResumeDetail from './pages/ResumeDetail'
import Resumes from './pages/Resumes'
import Settings from './pages/Settings'
import UploadResume from './pages/UploadResume'
import { PageSkeleton } from './components/feedback'

/** Only signed-in users can see /app. Others are sent to sign in, then back here. */
function RequireAuth() {
  const { status } = useSession()
  const location = useLocation()
  if (status === 'loading') {
    return <div className="mx-auto max-w-app px-4 py-10 md:px-8"><PageSkeleton rows={2} /></div>
  }
  if (status !== 'authed') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Sign-in and sign-up are for guests; signed-in users go straight to the app. */
function GuestOnly() {
  const { status } = useSession()
  if (status === 'loading') return null
  if (status === 'authed') return <Navigate to="/app" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<GuestOnly />}>
        <Route element={<AuthShell />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="resumes" element={<Resumes />} />
          <Route path="resumes/new" element={<UploadResume />} />
          <Route path="resumes/:id" element={<ResumeDetail />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="compare" element={<Compare />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
