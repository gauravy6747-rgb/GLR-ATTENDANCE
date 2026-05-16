import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import { getAllAttendance, overrideAttendance } from "../services/attendanceService"
import { getApiErrorMessage } from "../api/axios"

// The API returns naive UTC datetimes (no timezone info).
// Append 'Z' so the browser parses as UTC and converts to local IST automatically.
function parseBackendTime(value) {
  if (!value) return null
  const str = String(value)
  const isAware = str.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(str)
  return new Date(isAware ? str : str + "Z")
}

function formatDateTime(value) {
  if (!value) return "-"
  return parseBackendTime(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
}

function formatTimeOnly(value) {
  if (!value) return "--:--"
  return parseBackendTime(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatDate(value) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
}

function formatHours(value) {
  const hours = Number(value ?? 0)
  return `${hours.toFixed(2)} hrs`
}

function formatStatus(value) {
  if (!value) return "-"
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getStatusClass(value) {
  const status = value ?? ""
  if (["full_day", "on_time", "on_time_out", "present"].includes(status)) return "bg-green-100 text-green-700"
  if (["half_day", "late", "early_leave"].includes(status)) return "bg-yellow-100 text-yellow-800"
  if (["absent"].includes(status)) return "bg-red-100 text-red-700"
  return "bg-gray-100 text-gray-700"
}

function StatusBadge({ value }) {
  return (
    <span className={`inline-flex min-w-24 justify-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(value)}`}>
      {formatStatus(value)}
    </span>
  )
}

function AttendancePage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  // Use IST date as the default so the admin sees today's records in Indian time
  const [selectedDate, setSelectedDate] = useState(() => {
    const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    return istNow.toISOString().split("T")[0]
  })

  // Override Modal State
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [overrideData, setOverrideData] = useState({ day_status: "present", admin_note: "" })
  const [submitting, setSubmitting] = useState(false)

  const fetchRecords = () => {
    setLoading(true)
    getAllAttendance(selectedDate)
      .then(setRecords)
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load records")))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRecords()
  }, [selectedDate])

  const handleOverrideSubmit = async (e) => {
    e.preventDefault()
    if (!overrideData.admin_note) return alert("Please provide a reason for the override")
    
    setSubmitting(true)
    try {
      await overrideAttendance(selectedRecord.id, overrideData)
      setSelectedRecord(null)
      setOverrideData({ day_status: "present", admin_note: "" })
      fetchRecords()
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to override attendance"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-950">Daily Attendance</h2>
            <p className="text-sm text-gray-500">Viewing records for {formatDate(selectedDate)}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:border-emerald-500 outline-none transition"
            />
            <span className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm">
              {records.length} records
            </span>
          </div>
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</p>}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[1200px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Employee</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Check In</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Check Out</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Location</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-400">Loading records...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-400">No attendance found</td></tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-950">{record.employee_name}</div>
                        {record.is_anomaly_flagged && (
                          <span className="group relative cursor-help">
                            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="absolute left-6 top-0 hidden w-32 rounded-lg bg-gray-900 p-2 text-[10px] text-white group-hover:block z-10">
                              Anomaly detected (e.g. outside zone or face mismatch)
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{record.employee_id}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{formatDate(record.date)}</td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-gray-900">{formatTimeOnly(record.checkin_time)}</div>
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">{record.checkin_status}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-gray-900">{formatTimeOnly(record.checkout_time)}</div>
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">{record.checkout_status}</div>
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge value={record.day_status} />
                      {record.is_manual_override && (
                        <div className="mt-1 text-[10px] font-bold text-amber-600 uppercase">Overridden</div>
                      )}
                    </td>
                    <td className="p-4">
                      {record.checkin_lat ? (
                        <a 
                          href={`https://www.google.com/maps?q=${record.checkin_lat},${record.checkin_lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Map
                        </a>
                      ) : "-"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 transition"
                      >
                        Override
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-950">Manual Override</h3>
            <p className="mt-1 text-sm text-gray-500">
              Modifying attendance for <b>{selectedRecord.employee_name}</b> on {formatDate(selectedRecord.date)}
            </p>

            <form onSubmit={handleOverrideSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Status</label>
                <select
                  value={overrideData.day_status}
                  onChange={(e) => setOverrideData({ ...overrideData, day_status: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition"
                >
                  <option value="full_day">Full Day</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                  <option value="holiday_work">Holiday Work</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason (Mandatory)</label>
                <textarea
                  required
                  placeholder="e.g. Forgot to check out, system error..."
                  value={overrideData.admin_note}
                  onChange={(e) => setOverrideData({ ...overrideData, admin_note: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-emerald-300 transition"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AttendancePage
