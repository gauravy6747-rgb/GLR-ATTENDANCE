import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import { getAllAttendance, overrideAttendance } from "../services/attendanceService"
import { getApiErrorMessage } from "../api/axios"

const getISTComponents = () => {
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(new Date());
  
  const partMap = {};
  parts.forEach(p => partMap[p.type] = p.value);
  
  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10); // 1-indexed
  const day = parseInt(partMap.day, 10);
  
  const pad = (num) => String(num).padStart(2, "0");
  
  return {
    year,
    month,
    day,
    dateStr: `${year}-${pad(month)}-${pad(day)}`
  };
};

function formatDateTime(value) {
  if (!value) return "-"
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
}

function formatTimeOnly(value) {
  if (!value) return "--:--"
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
  const totalHours = Number(value ?? 0)
  const hrs = Math.floor(totalHours)
  const mins = Math.round((totalHours - hrs) * 60)
  const finalMins = mins === 60 ? 0 : mins
  const finalHrs = mins === 60 ? hrs + 1 : hrs
  return `${finalHrs} hrs ${finalMins} mins`
}

function formatStatus(value) {
  if (!value) return "-"
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getMoodEmoji(mood) {
  const map = {
    stressed: "😫",
    down: "🙁",
    neutral: "😐",
    good: "🙂",
    great: "😄"
  }
  return map[mood] || ""
}

function getStatusClass(value) {
  const status = value ?? ""
  if (["full_day", "on_time", "on_time_out", "present"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
  }
  if (["half_day", "late", "early_leave"].includes(status)) {
    return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
  }
  if (["absent"].includes(status)) {
    return "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30"
  }
  return "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
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
    const ist = getISTComponents()
    return ist.dateStr
  })

  // Override Modal State
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [selectedDetailRecord, setSelectedDetailRecord] = useState(null)
  const [overrideData, setOverrideData] = useState({ day_status: "present", admin_note: "" })
  const [manualCheckinTime, setManualCheckinTime] = useState("09:00")
  const [manualCheckoutTime, setManualCheckoutTime] = useState("18:00")
  const [submitting, setSubmitting] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

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

  // Global ESC key listener to dismiss any open modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (lightboxPhoto) setLightboxPhoto(null)
        else if (selectedDetailRecord) setSelectedDetailRecord(null)
        else if (selectedRecord) setSelectedRecord(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lightboxPhoto, selectedDetailRecord, selectedRecord])

  const handleOverrideClick = (record) => {
    setSelectedRecord(record)
    setOverrideData({ day_status: record.day_status || "present", admin_note: "" })
    
    const pad = (n) => String(n).padStart(2, "0")
    
    if (record.checkin_time) {
      const date = new Date(record.checkin_time)
      setManualCheckinTime(`${pad(date.getHours())}:${pad(date.getMinutes())}`)
    } else {
      setManualCheckinTime("09:00")
    }
    
    if (record.checkout_time) {
      const date = new Date(record.checkout_time)
      setManualCheckoutTime(`${pad(date.getHours())}:${pad(date.getMinutes())}`)
    } else {
      setManualCheckoutTime("18:00")
    }
  }

  const handleOverrideSubmit = async (e) => {
    e.preventDefault()
    
    setSubmitting(true)
    try {
      const payload = { ...overrideData }
      if (overrideData.day_status !== "absent") {
        if (overrideData.day_status === "present" && !manualCheckinTime) {
          payload.checkin_time = null
        } else {
          payload.checkin_time = `${selectedRecord.date}T${manualCheckinTime}:00`
        }

        if (overrideData.day_status === "present" && !manualCheckoutTime) {
          payload.checkout_time = null
        } else {
          payload.checkout_time = `${selectedRecord.date}T${manualCheckoutTime}:00`
        }
      } else {
        payload.checkin_time = null
        payload.checkout_time = null
      }
      await overrideAttendance(selectedRecord.id, payload)
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
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--color-text)" }}>Daily Attendance</h2>
            <p className="text-xs sm:text-sm" style={{ color: "var(--color-text-secondary)" }}>Viewing records for {formatDate(selectedDate)}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold shadow-sm outline-none transition"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                borderWidth: "1px",
                color: "var(--color-text)"
              }}
            />
            <span 
              className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold shadow-sm"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)"
              }}
            >
              {records.length} records
            </span>
          </div>
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 px-4 py-3 text-xs sm:text-sm text-red-700 dark:text-red-400">{error}</p>}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[1200px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Employee</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Check In</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Check Out</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Photos</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Location</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-400">Loading records...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-400">No attendance found</td></tr>
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
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">
                        {record.checkout_status} {record.total_hours > 0 && `• ${formatHours(record.total_hours)}`}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge value={record.day_status} />
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        {record.checkin_photo_url ? (
                          <button
                            onClick={() => setLightboxPhoto(record.checkin_photo_url)}
                            className="group relative h-10 w-10 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm transition hover:border-emerald-500"
                            title="View Check-In Photo"
                          >
                            <img
                              src={`/attendance/photo?path=${encodeURIComponent(record.checkin_photo_url)}`}
                              alt="Check-in"
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-110"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                              <span className="text-[10px] font-bold text-white uppercase">In</span>
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-semibold">—</span>
                        )}

                        {record.checkout_photo_url ? (
                          <button
                            onClick={() => setLightboxPhoto(record.checkout_photo_url)}
                            className="group relative h-10 w-10 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm transition hover:border-emerald-500"
                            title="View Check-Out Photo"
                          >
                            <img
                              src={`/attendance/photo?path=${encodeURIComponent(record.checkout_photo_url)}`}
                              alt="Check-out"
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-110"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                              <span className="text-[10px] font-bold text-white uppercase">Out</span>
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-semibold">—</span>
                        )}
                      </div>
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
                          {record.location || "Map"}
                        </a>
                      ) : "-"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedDetailRecord(record)}
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleOverrideClick(record)}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 transition"
                        >
                          Override
                        </button>
                      </div>
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
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setSelectedRecord(null)}
        >
          <div 
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl my-auto transition-colors duration-300"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>Manual Override</h3>
                <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  Modifying attendance for <b style={{ color: "var(--color-text)" }}>{selectedRecord.employee_name}</b> on {formatDate(selectedRecord.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1.5 transition hover:opacity-80"
                style={{
                  background: "var(--color-surface-raised)",
                  color: "var(--color-text-secondary)"
                }}
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>New Status</label>
                <select
                  value={overrideData.day_status}
                  onChange={(e) => setOverrideData({ ...overrideData, day_status: e.target.value })}
                  className="w-full rounded-xl p-2.5 text-sm outline-none transition font-medium"
                  style={{
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)"
                  }}
                >
                  <option value="present">Present (Active)</option>
                  <option value="full_day">Full Day</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                  <option value="holiday_work">Holiday Work</option>
                </select>
              </div>

              {overrideData.day_status !== "absent" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>
                      Check-In {overrideData.day_status === "present" ? "(Opt)" : "(Req)"}
                    </label>
                    <input
                      type="time"
                      required={overrideData.day_status !== "present"}
                      value={manualCheckinTime}
                      onChange={(e) => setManualCheckinTime(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm outline-none transition font-semibold"
                      style={{
                        background: "var(--color-surface-raised)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)"
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>
                      Check-Out {overrideData.day_status === "present" ? "(Opt)" : "(Req)"}
                    </label>
                    <input
                      type="time"
                      required={overrideData.day_status !== "present"}
                      value={manualCheckoutTime}
                      onChange={(e) => setManualCheckoutTime(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm outline-none transition font-semibold"
                      style={{
                        background: "var(--color-surface-raised)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)"
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>Reason (Optional)</label>
                <textarea
                  placeholder="e.g. Forgot to check out, system error..."
                  value={overrideData.admin_note}
                  onChange={(e) => setOverrideData({ ...overrideData, admin_note: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl p-2.5 text-sm outline-none transition resize-none"
                  style={{
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)"
                  }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="flex-1 rounded-xl py-2.5 text-xs font-bold transition hover:opacity-80"
                  style={{
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-secondary)"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {selectedDetailRecord && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setSelectedDetailRecord(null)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto my-auto transition-colors duration-300"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>Attendance Details</h3>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {selectedDetailRecord.employee_name} ({selectedDetailRecord.employee_id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                className="rounded-lg p-1.5 transition hover:opacity-80"
                style={{
                  background: "var(--color-surface-raised)",
                  color: "var(--color-text-secondary)"
                }}
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Check-In Details Card */}
              <div 
                className="rounded-xl p-4 space-y-3.5 transition-colors duration-300"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)"
                }}
              >
                <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--color-border)" }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-950/60 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">IN</span>
                  <h4 className="font-bold text-xs" style={{ color: "var(--color-text)" }}>Check-In</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="block text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Time</span>
                    <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                      {formatTimeOnly(selectedDetailRecord.checkin_time)}
                    </span>
                    <span className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${getStatusClass(selectedDetailRecord.checkin_status)}`}>
                      {selectedDetailRecord.checkin_status}
                    </span>
                  </div>

                  {selectedDetailRecord.checkin_mood && (
                    <div>
                      <span className="block text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>User Mood</span>
                      <div 
                        className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1"
                        style={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)"
                        }}
                      >
                        <span className="text-base">{getMoodEmoji(selectedDetailRecord.checkin_mood)}</span>
                        <span className="font-bold capitalize">{selectedDetailRecord.checkin_mood}</span>
                      </div>
                    </div>
                  )}

                  {selectedDetailRecord.checkin_mood_note && (
                    <div>
                      <span className="block text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Mood Note</span>
                      <p 
                        className="mt-0.5 rounded-lg p-2 italic leading-relaxed text-xs"
                        style={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)"
                        }}
                      >
                        &ldquo;{selectedDetailRecord.checkin_mood_note}&rdquo;
                      </p>
                    </div>
                  )}

                  {selectedDetailRecord.checkin_note && (
                    <div>
                      <span className="block text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Activity Note</span>
                      <p 
                        className="mt-0.5 rounded-lg p-2 italic leading-relaxed text-xs"
                        style={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)"
                        }}
                      >
                        &ldquo;{selectedDetailRecord.checkin_note}&rdquo;
                      </p>
                    </div>
                  )}

                  {selectedDetailRecord.checkin_photo_url && (
                    <div>
                      <span className="block text-[11px] font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Selfie (tap to expand)</span>
                      <button
                        type="button"
                        onClick={() => setLightboxPhoto(selectedDetailRecord.checkin_photo_url)}
                        className="h-28 w-full overflow-hidden rounded-lg group relative cursor-pointer block shadow-sm hover:opacity-95 text-left"
                        style={{
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface)"
                        }}
                        title="Click to view full photo"
                      >
                        <img
                          src={`/attendance/photo?path=${encodeURIComponent(selectedDetailRecord.checkin_photo_url)}`}
                          alt="Check-in verification"
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <span className="text-[10px] font-bold text-white uppercase bg-black/70 px-2 py-1 rounded-md">View Photo</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Check-Out Details Card */}
              <div 
                className="rounded-xl p-4 space-y-3.5 transition-colors duration-300"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)"
                }}
              >
                <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--color-border)" }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-900 text-[10px] font-bold text-white">OUT</span>
                  <h4 className="font-bold text-xs" style={{ color: "var(--color-text)" }}>Check-Out</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="block text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Time</span>
                    <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                      {formatTimeOnly(selectedDetailRecord.checkout_time)}
                    </span>
                    {selectedDetailRecord.checkout_status && (
                      <span className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${getStatusClass(selectedDetailRecord.checkout_status)}`}>
                        {selectedDetailRecord.checkout_status}
                      </span>
                    )}
                  </div>

                  {selectedDetailRecord.total_hours > 0 && (
                    <div>
                      <span className="block text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Worked Hours</span>
                      <span className="font-bold" style={{ color: "var(--color-text)" }}>
                        {formatHours(selectedDetailRecord.total_hours)}
                      </span>
                    </div>
                  )}

                  {selectedDetailRecord.checkout_mood && (
                    <div>
                      <span className="block text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>User Mood</span>
                      <div 
                        className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1"
                        style={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)"
                        }}
                      >
                        <span className="text-base">{getMoodEmoji(selectedDetailRecord.checkout_mood)}</span>
                        <span className="font-bold capitalize">{selectedDetailRecord.checkout_mood}</span>
                      </div>
                    </div>
                  )}

                  {selectedDetailRecord.checkout_mood_note && (
                    <div>
                      <span className="block text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Mood Note</span>
                      <p 
                        className="mt-0.5 rounded-lg p-2 italic leading-relaxed text-xs"
                        style={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)"
                        }}
                      >
                        &ldquo;{selectedDetailRecord.checkout_mood_note}&rdquo;
                      </p>
                    </div>
                  )}

                  {selectedDetailRecord.checkout_note && (
                    <div>
                      <span className="block text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Activity Note</span>
                      <p 
                        className="mt-0.5 rounded-lg p-2 italic leading-relaxed text-xs"
                        style={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)"
                        }}
                      >
                        &ldquo;{selectedDetailRecord.checkout_note}&rdquo;
                      </p>
                    </div>
                  )}

                  {selectedDetailRecord.checkout_photo_url && (
                    <div>
                      <span className="block text-[11px] font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Selfie (tap to expand)</span>
                      <button
                        type="button"
                        onClick={() => setLightboxPhoto(selectedDetailRecord.checkout_photo_url)}
                        className="h-28 w-full overflow-hidden rounded-lg group relative cursor-pointer block shadow-sm hover:opacity-95 text-left"
                        style={{
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface)"
                        }}
                        title="Click to view full photo"
                      >
                        <img
                          src={`/attendance/photo?path=${encodeURIComponent(selectedDetailRecord.checkout_photo_url)}`}
                          alt="Check-out verification"
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <span className="text-[10px] font-bold text-white uppercase bg-black/70 px-2 py-1 rounded-md">View Photo</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                className="w-full rounded-xl py-3 text-xs font-bold transition hover:opacity-90 shadow-sm"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)"
                }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
          onClick={() => setLightboxPhoto(null)}
        >
          <div 
            className="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl my-auto transition-all duration-200"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title and Close Button */}
            <div 
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text)" }}>
                  Verification Photo Detail
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="rounded-lg p-1.5 transition hover:scale-105 active:scale-95"
                style={{
                  background: "var(--color-surface-raised)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)"
                }}
                aria-label="Close photo"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Photo preview container */}
            <div className="p-3 bg-black/5 dark:bg-black/30 flex items-center justify-center">
              <img
                src={`/attendance/photo?path=${encodeURIComponent(lightboxPhoto)}`}
                alt="Verification selfie"
                className="w-full max-h-[60vh] object-contain rounded-xl shadow-inner"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = "https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=600"
                }}
              />
            </div>

            {/* Footer with prominent Cancel / Close button */}
            <div 
              className="p-3 border-t flex items-center justify-between gap-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <span className="text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Tap outside or press ESC to dismiss
              </span>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="rounded-xl px-5 py-2 text-xs font-bold transition hover:scale-105 active:scale-95 shadow-sm"
                style={{
                  background: "var(--color-surface-raised)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)"
                }}
              >
                Close / Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AttendancePage
