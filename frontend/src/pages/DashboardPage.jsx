import { useEffect, useState } from "react"
import { getAdminStats } from "../services/dashboardService"
import AdminLayout from "../layouts/AdminLayout"
import { getApiErrorMessage } from "../api/axios"

const statCards = [
  {
    key: "total_employees",
    label: "Total Employees",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    key: "today_present",
    label: "Present Today",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    key: "today_absent",
    label: "Absent Today",
    gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    key: "full_day_count",
    label: "Full Day",
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  {
    key: "half_day_count",
    label: "Half Day",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
]

function DashboardPage() {
  const name = localStorage.getItem("name")
  const role = localStorage.getItem("role")

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let ignore = false

    getAdminStats()
      .then((data) => {
        if (!ignore) {
          setStats(data)
          setError("")
        }
      })
      .catch((loadError) => {
        console.error(loadError)

        if (!ignore) {
          setError(getApiErrorMessage(loadError, "Failed to load dashboard stats"))
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-6 fade-in">
        {/* Welcome Section */}
        <section className="rounded-2xl p-6 transition-colors duration-300"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
                Welcome, {name}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Role: <span className="font-semibold capitalize" style={{ color: "var(--color-text)" }}>{role}</span>
              </p>
            </div>

            {stats && !error && (
              <div className="rounded-xl px-4 py-3 text-sm font-semibold"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "var(--color-accent)",
                }}>
                📅 Today: {stats.date}
              </div>
            )}
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
              style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }}
            >
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="rounded-xl px-4 py-3 font-medium"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "var(--color-danger)",
            }}>
            {error}
          </p>
        )}

        {/* Stats Cards */}
        {stats && !error && (
          <section>
            <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--color-text)" }}>
              Today&apos;s Summary
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 stagger-children">
              {statCards.map((card) => (
                <div
                  key={card.key}
                  className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* Gradient accent bar */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "3px",
                      background: card.gradient,
                      borderRadius: "2px 2px 0 0",
                    }}
                  />

                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                      {card.label}
                    </h3>
                    <div
                      className="rounded-xl p-2 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: card.gradient, color: "white", boxShadow: "var(--shadow-sm)" }}
                    >
                      {card.icon}
                    </div>
                  </div>

                  <p className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>
                    {stats[card.key]}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  )
}

export default DashboardPage
