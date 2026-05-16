import { useEffect, useState } from "react"
import EmployeeLayout from "../../layouts/EmployeeLayout"
import { getMyHistory } from "../../services/attendanceService"
import api, { getApiErrorMessage } from "../../api/axios"
import AttendanceCalendar from "../../components/AttendanceCalendar"

function formatDate(value) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    weekday: "short", day: "2-digit", month: "short", year: "numeric"
  })
}

function formatTime(value) {
  if (!value) return "--:--"
  const str = String(value)
  // Backend stores UTC times as naive strings (no offset).
  // Append 'Z' so the browser parses them as UTC and converts to local IST.
  const isAware = str.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(str)
  return new Date(isAware ? str : str + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const statusConfig = {
  full_day:      { label: "Full Day",     cls: "bg-emerald-100 text-emerald-700" },
  half_day:      { label: "Half Day",     cls: "bg-amber-100 text-amber-700" },
  present:       { label: "Present",      cls: "bg-blue-100 text-blue-700" },
  absent:        { label: "Absent",       cls: "bg-red-100 text-red-700" },
  holiday_work:  { label: "Holiday Work", cls: "bg-purple-100 text-purple-700" },
  comp_off_leave:{ label: "Comp-Off",     cls: "bg-indigo-100 text-indigo-700" },
}

function DayBadge({ status }) {
  const cfg = statusConfig[status] || { label: status || "—", cls: "bg-gray-100 text-gray-600" }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export default function MyAttendancePage() {
  const [records, setRecords] = useState([])
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [view, setView] = useState("calendar") // calendar | list

  useEffect(() => {
    Promise.all([
      getMyHistory(),
      api.get("/company/holidays")
    ])
      .then(([history, hols]) => {
        setRecords(history)
        setHolidays(hols.data)
        setError("")
      })
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load data")))
      .finally(() => setLoading(false))
  }, [])

  // Summary stats
  const fullDays  = records.filter((r) => r.day_status === "full_day").length
  const halfDays  = records.filter((r) => r.day_status === "half_day").length
  const totalHrs  = records.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0)

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-md space-y-5 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-950">My Attendance</h2>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setView("calendar")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${view === "calendar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              List
            </button>
          </div>
        </div>

        {/* Summary strip */}
        {!loading && !error && records.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Full Days",  value: fullDays },
              { label: "Half Days",  value: halfDays },
              { label: "Total Hours", value: `${totalHrs.toFixed(1)}h` }
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                <p className="text-xl font-bold text-gray-950">{value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        )}

        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {/* Calendar View */}
        {!loading && !error && view === "calendar" && (
          <AttendanceCalendar records={records} holidays={holidays} />
        )}

        {/* Records list View */}
        {!loading && !error && view === "list" && (
          <div className="space-y-3">
            {records.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-10">No attendance records yet.</p>
            )}
            {records.map((record, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-emerald-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{formatDate(record.date)}</p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                      <span>In: <span className="font-semibold text-gray-700">{formatTime(record.checkin_time)}</span></span>
                      <span>Out: <span className="font-semibold text-gray-700">{formatTime(record.checkout_time)}</span></span>
                    </div>
                    {record.total_hours > 0 && (
                      <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">
                        {Number(record.total_hours).toFixed(2)} hrs worked
                      </p>
                    )}
                    {record.checkin_note && (
                      <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs italic text-gray-500">
                        &ldquo;{record.checkin_note}&rdquo;
                      </p>
                    )}
                  </div>
                  <DayBadge status={record.day_status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EmployeeLayout>
  )
}
