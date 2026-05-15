import { useEffect, useState } from "react"
import { getAdminStats } from "../services/dashboardService"
import AdminLayout from "../layouts/AdminLayout"
import { getApiErrorMessage } from "../api/axios"

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
      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-950">
                Welcome, {name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Role: <span className="font-semibold capitalize text-gray-700">{role}</span>
              </p>
            </div>

            {stats && !error && (
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                Today: {stats.date}
              </div>
            )}
          </div>
        </section>

        {loading && <p>Loading dashboard...</p>}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">
            {error}
          </p>
        )}

        {stats && !error && (
          <section>
            <h2 className="mb-4 text-lg font-bold text-gray-950">
              Today&apos;s Summary
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500">
                  Total Employees
                </h3>

                <p className="mt-3 text-3xl font-bold text-gray-950">
                  {stats.total_employees}
                </p>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-emerald-700">
                  Present Today
                </h3>

                <p className="mt-3 text-3xl font-bold text-gray-950">
                  {stats.today_present}
                </p>
              </div>

              <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-red-700">
                  Absent Today
                </h3>

                <p className="mt-3 text-3xl font-bold text-gray-950">
                  {stats.today_absent}
                </p>
              </div>

              <div className="rounded-lg border border-indigo-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-indigo-700">
                  Full Day
                </h3>

                <p className="mt-3 text-3xl font-bold text-gray-950">
                  {stats.full_day_count}
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-amber-700">
                  Half Day
                </h3>

                <p className="mt-3 text-3xl font-bold text-gray-950">
                  {stats.half_day_count}
                </p>
              </div>

            </div>

          </section>
        )}

      </div>
    </AdminLayout>
  )
}

export default DashboardPage
