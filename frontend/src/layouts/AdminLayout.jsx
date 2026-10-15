import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import ThemeToggle from "../components/ThemeToggle"

const navItems = [
  {
    label: "Dashboard", path: "/dashboard",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    )
  },
  {
    label: "Employees", path: "/employees",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    label: "Attendance", path: "/attendance",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    )
  },
  {
    label: "Locations", path: "/office-locations",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    label: "Leave Requests", path: "/leave-requests",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    label: "Mispunch Requests", path: "/mispunch-requests",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    label: "Reports", path: "/reports",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    label: "Payroll", path: "/payroll",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    label: "Settings", path: "/settings",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
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
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] lg:flex transition-colors duration-300">
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between border-b bg-[var(--color-surface)] px-5 py-4 lg:hidden transition-colors duration-300"
        style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white shadow-md">
            GLR
          </div>
          <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>Management</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="rounded-xl p-2 transition-all duration-200 hover:scale-105"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
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
    </div>

      {/* Sidebar */}
      <aside
        className={`${
          isMobileMenuOpen ? "block" : "hidden"
        } w-full flex-col px-4 py-5 lg:flex lg:min-h-screen lg:w-72 transition-colors duration-300`}
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
          borderBottom: isMobileMenuOpen ? "1px solid var(--sidebar-border)" : "none",
        }}
      >
        {/* Logo */}
        <div className="mb-8 hidden items-center gap-3 lg:flex slide-in">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white shadow-lg pulse-glow">
            GLR
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>GLR Attendance</h2>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Management</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="grid gap-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path)
                  setIsMobileMenuOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-all duration-200"
                style={{
                  background: isActive ? "var(--sidebar-active-bg)" : "transparent",
                  border: `1px solid ${isActive ? "var(--sidebar-active-border)" : "transparent"}`,
                  color: isActive ? "var(--sidebar-active-text)" : "var(--color-text-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--sidebar-hover)"
                    e.currentTarget.style.color = "var(--color-text)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = "var(--color-text-secondary)"
                  }
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full" style={{ background: "var(--sidebar-active-text)", boxShadow: "0 0 8px var(--sidebar-active-text)" }} />
                )}
              </button>
            )
          })}
        </nav>

        {/* User Card + Logout */}
        <div className="mt-8 pt-5 lg:mt-auto" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="mb-4 rounded-xl p-4 transition-colors duration-300"
            style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
            <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text)" }}>{name}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>{role}</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
            style={{
              border: "1px solid var(--color-danger)",
              color: "var(--color-danger)",
              background: "transparent",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 px-6 py-4 backdrop-blur-md lg:px-8 transition-colors duration-300"
          style={{
            background: "color-mix(in srgb, var(--color-surface) 92%, transparent)",
            borderBottom: "1px solid var(--color-border)",
          }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="fade-in">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>
                Admin Panel
              </p>
              <h1 className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text)" }}>
                {currentPage?.label || "Dashboard"}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="rounded-xl px-4 py-2 text-sm transition-colors duration-300"
                style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <span className="font-semibold" style={{ color: "var(--color-text)" }}>{name}</span>
                <span className="ml-2" style={{ color: "var(--color-text-secondary)" }}>({role})</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-8 fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
