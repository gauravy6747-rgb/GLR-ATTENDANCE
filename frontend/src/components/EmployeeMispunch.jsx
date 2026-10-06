import { useState, useEffect } from "react"
import { submitMispunchRequest, getMyMispunchRequests } from "../services/mispunchService"
import { getMyHistory } from "../services/attendanceService"
import AttendanceCalendar from "./AttendanceCalendar"
import api, { getApiErrorMessage } from "../api/axios"
import { useAuth } from "../context/AuthContext"

function StatusBadge({ status }) {
  const map = {
    full_day: { label: "Full Day", cls: "bg-emerald-100 text-emerald-700" },
    half_day: { label: "Half Day", cls: "bg-amber-100 text-amber-700" },
    present: { label: "Present", cls: "bg-blue-100 text-blue-700" },
    holiday: { label: "Holiday", cls: "bg-purple-100 text-purple-700" },
    absent: { label: "Absent", cls: "bg-red-100 text-red-700" },
  }
  const s = map[status] || { label: status || "—", cls: "bg-gray-100 text-gray-700" }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

export default function EmployeeMispunch() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Calendar states inside modal
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarRecords, setCalendarRecords] = useState([])
  const [calendarHolidays, setCalendarHolidays] = useState([])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const nextCalendarMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
  const prevCalendarMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))

  // Form state
  const [showModal, setShowModal] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [requestType, setRequestType] = useState("checkout_only")
  const [checkinTime, setCheckinTime] = useState("09:30")
  const [checkoutTime, setCheckoutTime] = useState("18:00")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchMyRequests()
    Promise.all([
      getMyHistory(),
      api.get("/company/holidays")
    ])
      .then(([history, hols]) => {
        setCalendarRecords(Array.isArray(history) ? history : [])
        setCalendarHolidays(Array.isArray(hols?.data) ? hols.data : [])
      })
      .catch(() => {})
  }, [])

  const fetchMyRequests = async () => {
    setLoading(true)
    try {
      const data = await getMyMispunchRequests()
      setRequests(data)
      setError("")
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load mispunch history"))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason.trim()) {
      alert("Please provide a reason for the mispunch request.")
      return
    }

    setSubmitting(true)
    setError("")
    setSuccessMsg("")

    try {
      // Build ISO datetime strings based on date and time inputs
      let reqCheckin = null
      let reqCheckout = null

      if (["checkin_only", "both"].includes(requestType) && checkinTime) {
        reqCheckin = `${date}T${checkinTime}:00`
      }

      if (["checkout_only", "both"].includes(requestType) && checkoutTime) {
        reqCheckout = `${date}T${checkoutTime}:00`
      }

      const payload = {
        date,
        request_type: requestType,
        requested_checkin_time: reqCheckin,
        requested_checkout_time: reqCheckout,
        reason: reason.trim()
      }

      const newReq = await submitMispunchRequest(payload)
      setRequests([newReq, ...requests])
      setSuccessMsg("Mispunch regularization request submitted successfully!")
      setShowModal(false)
      setReason("")
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to submit mispunch request"))
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return "—"
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "—"
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-950">Mispunch Regularization</h3>
          <p className="text-xs text-gray-500">Request correction for forgotten check-in or check-out punches.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
        >
          + Request Mispunch
        </button>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* History List */}
      {loading ? (
        <p className="text-xs text-gray-400 py-6 text-center">Loading mispunch requests...</p>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
          <p className="text-xs text-gray-500">No mispunch requests submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{formatDate(req.date)}</p>
                  <span className={`mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    req.request_type === "both" ? "bg-purple-50 text-purple-700" :
                    req.request_type === "checkin_only" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                  }`}>
                    {req.request_type === "both" ? "Check-in & Out" :
                     req.request_type === "checkin_only" ? "Check-in Only" : "Check-out Only"}
                  </span>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                  req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {req.status}
                </span>
              </div>

              <div className="flex gap-4 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                {["checkin_only", "both"].includes(req.request_type) && (
                  <div>
                    <span className="text-gray-400">Requested In: </span>
                    <span className="font-semibold text-gray-900">{formatTime(req.requested_checkin_time)}</span>
                  </div>
                )}
                {["checkout_only", "both"].includes(req.request_type) && (
                  <div>
                    <span className="text-gray-400">Requested Out: </span>
                    <span className="font-semibold text-gray-900">{formatTime(req.requested_checkout_time)}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-600 italic">
                &ldquo;{req.reason}&rdquo;
              </p>

              {req.admin_notes && (
                <div className="text-[11px] text-gray-500 bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                  <span className="font-bold text-amber-900">Admin Note: </span>
                  {req.admin_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Requesting Mispunch */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-950">
                  Request Mispunch Regularization
                </h3>
                <p className="text-xs text-gray-500">
                  Tap a date on the calendar below to select the mispunch date.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Calendar Date Picker inside Modal */}
              <div className="space-y-2 border border-gray-200 bg-gray-50/50 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    1. Select Attendance Date
                  </label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={prevCalendarMonth}
                      className="rounded p-1 hover:bg-gray-100"
                    >
                      ‹
                    </button>
                    <span>{monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
                    <button
                      type="button"
                      onClick={nextCalendarMonth}
                      className="rounded p-1 hover:bg-gray-100"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <AttendanceCalendar
                  records={calendarRecords}
                  holidays={calendarHolidays}
                  currentDate={calendarDate}
                  selectedDate={date}
                  onSelectDate={(dateStr) => setDate(dateStr)}
                  saturdayPolicy={user?.saturday_policy || "alt_sat_holiday"}
                />

                {/* Selected Date Summary Banner */}
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-emerald-800 font-medium">Selected Date: </span>
                    <span className="font-bold text-gray-950">
                      {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                  </div>
                  {(() => {
                    const log = calendarRecords.find(r => r.date === date)
                    const hol = calendarHolidays.find(h => h.date === date)
                    const status = log?.day_status || (hol ? "holiday" : "absent")
                    return <StatusBadge status={status} />
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mis-punch Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1"
                >
                  <option value="checkout_only">Forgot Check-out Only</option>
                  <option value="checkin_only">Forgot Check-in Only</option>
                  <option value="both">Forgot Both Check-in & Check-out</option>
                </select>
              </div>

              {["checkin_only", "both"].includes(requestType) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Requested Check-in Time
                  </label>
                  <input
                    type="time"
                    value={checkinTime}
                    onChange={(e) => setCheckinTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1"
                    required
                  />
                </div>
              )}

              {["checkout_only", "both"].includes(requestType) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Requested Check-out Time
                  </label>
                  <input
                    type="time"
                    value={checkoutTime}
                    onChange={(e) => setCheckoutTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for Mispunch
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. System issue / Forgot to checkout while leaving office..."
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
