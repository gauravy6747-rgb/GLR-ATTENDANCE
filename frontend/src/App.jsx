import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom"
import { useAuth } from "./context/AuthContext"
import OfflineBanner from "./components/OfflineBanner"
import PwaInstallPrompt from "./components/PwaInstallPrompt"

// Admin pages
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import EmployeesPage from "./pages/EmployeesPage"
import AttendancePage from "./pages/AttendancePage"
import ReportsPage from "./pages/ReportsPage"
import CompanySettingsPage from "./pages/CompanySettingsPage"
import LeaveRequestsPage from "./pages/LeaveRequestsPage"
import LocationsPage from "./pages/LocationsPage"

// Employee pages
import FaceEnrollPage from "./pages/employee/FaceEnrollPage"
import HomePage from "./pages/employee/HomePage"
import MyAttendancePage from "./pages/employee/MyAttendancePage"
import MyLeavePage from "./pages/employee/MyLeavePage"

function ProtectedRoute({ children, adminOnly = false, employeeOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f7f9]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />

  if (adminOnly && !["admin", "superadmin"].includes(user.role)) {
    return <Navigate to="/home" replace />
  }

  if (employeeOnly && user.role !== "employee") {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// Auto-redirect from "/" based on auth state
function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f7f9]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  if (user.role === "employee") {
    return <Navigate to={user.face_enrolled ? "/home" : "/enroll"} replace />
  }

  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <PwaInstallPrompt />
      <Routes>
        {/* Public — smart redirect if already logged in */}
        <Route path="/" element={<RootRedirect />} />

        {/* Face enrollment — must complete before accessing employee portal */}
        <Route
          path="/enroll"
          element={
            <ProtectedRoute>
              <FaceEnrollPage />
            </ProtectedRoute>
          }
        />

        {/* Employee portal */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-attendance"
          element={
            <ProtectedRoute>
              <MyAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave"
          element={
            <ProtectedRoute>
              <MyLeavePage />
            </ProtectedRoute>
          }
        />

        {/* Admin panel */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute adminOnly>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute adminOnly>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/office-locations"
          element={
            <ProtectedRoute adminOnly>
              <LocationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute adminOnly>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute adminOnly>
              <CompanySettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave-requests"
          element={
            <ProtectedRoute adminOnly>
              <LeaveRequestsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
