import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import ThemeToggle from "../components/ThemeToggle"

const navItems = [
  {
    label: "Home",
    path: "/home",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
      </svg>
    )
  },
  {
    label: "Attendance",
    path: "/my-attendance",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    label: "Leave",
    path: "/leave",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  }
]

function EmployeeLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const name = user?.name || localStorage.getItem("name") || "Employee"

  const handleLogout = async () => {
    await logout()
    navigate("/")
  }

  return (
    <div className="flex min-h-screen flex-col transition-colors duration-300"
      style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-5 py-4 backdrop-blur-md transition-colors duration-300"
        style={{
          background: "color-mix(in srgb, var(--color-surface) 92%, transparent)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white shadow-md pulse-glow">
              GLR
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Hi, {name.split(" ")[0]}</p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Employee Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105"
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
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 fade-in">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-20 transition-colors duration-300"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
        }}>
        <div className="flex">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition-all duration-200"
                style={{
                  color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                  position: "relative",
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "32px",
                      height: "3px",
                      borderRadius: "0 0 4px 4px",
                      background: "var(--color-accent)",
                      boxShadow: "0 2px 8px var(--color-accent)",
                    }}
                  />
                )}
                <span>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default EmployeeLayout
