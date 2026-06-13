import { useEffect, useState } from "react"
import EmployeeLayout from "../../layouts/EmployeeLayout"
import { getMyHistory } from "../../services/attendanceService"
import api, { getApiErrorMessage } from "../../api/axios"
import AttendanceCalendar from "../../components/AttendanceCalendar"
import EmployeeStatsDashboard from "../../components/EmployeeStatsDashboard"
import EmployeePayrollSlip from "../../components/EmployeePayrollSlip"
import { useAuth } from "../../context/AuthContext"

function formatDate(value) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    weekday: "short", day: "2-digit", month: "short", year: "numeric"
  })
}

function formatTime(value) {
  if (!value) return "--:--"
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatHours(value) {
  const totalHours = Number(value ?? 0)
  const hrs = Math.floor(totalHours)
  const mins = Math.round((totalHours - hrs) * 60)
  const finalMins = mins === 60 ? 0 : mins
  const finalHrs = mins === 60 ? hrs + 1 : hrs
  return `${finalHrs} hrs ${finalMins} mins`
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
  const { user } = useAuth()
  const saturdayPolicy = user?.saturday_policy || "alt_sat_holiday"

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

  const [currentDate, setCurrentDate] = useState(new Date())

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

  // Helper to determine if a date string is Saturday
  const isSaturday = (dateStr) => {
    if (!dateStr) return false
    const [y, m, d] = dateStr.split("-").map(Number)
    const dateObj = new Date(y, m - 1, d)
    return dateObj.getDay() === 6
  }

  // Filter records for the currently selected month and year
  const monthlyRecords = records.filter((r) => {
    if (!r.date) return false
    const [y, m] = r.date.split("-").map(Number)
    return y === currentDate.getFullYear() && m === (currentDate.getMonth() + 1)
  })

  // Summary stats (filtered by month)
  const fullDays  = monthlyRecords.filter((r) => r.day_status === "full_day").length
  const halfDays  = monthlyRecords.filter((r) => r.day_status === "half_day").length
  
  // Scale Saturday hours under all_sat_half_day policy by 9.0 / 6.5 (Option 1)
  const totalHrs  = monthlyRecords.reduce((sum, r) => {
    let hours = Number(r.total_hours) || 0
    if (saturdayPolicy === "all_sat_half_day" && r.date && isSaturday(r.date)) {
      hours = hours * (9.0 / 6.5)
    }
    return sum + hours
  }, 0)

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-md space-y-5 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-950">My Attendance</h2>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setView("calendar")}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-bold transition ${view === "calendar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-bold transition ${view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              List
            </button>
            <button
              onClick={() => setView("stats")}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-bold transition ${view === "stats" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Stats
            </button>
            <button
              onClick={() => setView("payroll")}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-bold transition ${view === "payroll" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Payroll
            </button>
          </div>
        </div>

        {/* Unified Month Selector Header */}
        {!loading && !error && !["stats", "payroll"].includes(view) && (
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-100">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-100">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Summary strip */}
        {!loading && !error && !["stats", "payroll"].includes(view) && records.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Full Days",  value: fullDays },
              { label: "Half Days",  value: halfDays },
              { label: "Avg Hours/Day", value: `${monthlyRecords.length > 0 ? (totalHrs / monthlyRecords.length).toFixed(1) : "0.0"}h` }
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
          <AttendanceCalendar records={records} holidays={holidays} currentDate={currentDate} />
        )}

        {/* Records list View */}
        {!loading && !error && view === "list" && (
          <div className="space-y-3">
            {monthlyRecords.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-10">No attendance records for this month.</p>
            )}
            {monthlyRecords.map((record, i) => (
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
                        {formatHours(record.total_hours)} worked
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

        {/* Stats Dashboard View */}
        {!loading && !error && view === "stats" && (
          <EmployeeStatsDashboard />
        )}

        {/* Payroll Slip View */}
        {!loading && !error && view === "payroll" && (
          <EmployeePayrollSlip />
        )}
      </div>
    </EmployeeLayout>
  )
}
