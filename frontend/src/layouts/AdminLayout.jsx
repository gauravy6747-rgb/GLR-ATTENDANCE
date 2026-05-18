import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Employees", path: "/employees" },
  { label: "Attendance", path: "/attendance" },
  { label: "Locations", path: "/office-locations" },
  { label: "Leave Requests", path: "/leave-requests" },
  { label: "Reports", path: "/reports" },
  { label: "Payroll", path: "/payroll" },
  { label: "Settings", path: "/settings" }
]

function AdminLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const currentPage = navItems.find((item) => item.path === location.pathname)
  const name = user?.name || localStorage.getItem("name") || "Admin User"
  const role = user?.role || localStorage.getItem("role") || "admin"

  const handleLogout = async () => {
    await logout()
    navigate("/")
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-gray-900 lg:flex">
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
            GLR
          </div>
          <h2 className="text-base font-bold text-gray-950">Management</h2>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          isMobileMenuOpen ? "block" : "hidden"
        } w-full flex-col border-b border-gray-200 bg-white px-5 py-5 lg:flex lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r`}
      >
        <div className="mb-8 hidden items-center gap-3 lg:flex">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            GLR
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-950">GLR Attendance</h2>
            <p className="text-xs font-medium uppercase text-gray-500">Management</p>
          </div>
        </div>

        <nav className="grid gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path)
                  setIsMobileMenuOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-950"
                }`}
              >
                <span>{item.label}</span>
                {isActive && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
              </button>
            )
          })}
        </nav>

        <div className="mt-8 border-t border-gray-200 pt-5 lg:mt-auto">
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="truncate text-sm font-semibold text-gray-950">{name}</p>
            <p className="mt-1 text-xs font-medium uppercase text-gray-500">{role}</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-6 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">
                Admin Panel
              </p>
              <h1 className="mt-1 text-2xl font-bold text-gray-950">
                {currentPage?.label || "Dashboard"}
              </h1>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm">
              <span className="font-semibold text-gray-900">{name}</span>
              <span className="ml-2 text-gray-500">({role})</span>
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
