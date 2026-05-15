import { useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import { downloadAttendanceReport } from "../services/reportService"
import { getApiErrorMessage } from "../api/axios"

function ReportsPage() {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState("")

  const handleDownload = async () => {
    setDownloading(true)
    setError("")

    try {
      const reportBlob = await downloadAttendanceReport()
      const url = window.URL.createObjectURL(reportBlob)
      const link = document.createElement("a")

      link.href = url
      link.download = "attendance_report.xlsx"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (downloadError) {
      console.error(downloadError)
      setError(getApiErrorMessage(downloadError, "Failed to download attendance report"))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-950">
            Reports
          </h2>
        </div>

        <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-950">
                Attendance Excel Report
              </h3>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {downloading ? "Downloading..." : "Download"}
            </button>
          </div>

          {error && (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default ReportsPage
