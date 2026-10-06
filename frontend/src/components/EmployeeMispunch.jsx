import { useState, useEffect } from "react"
import { submitMispunchRequest, getMyMispunchRequests } from "../services/mispunchService"
import { getApiErrorMessage } from "../api/axios"

export default function EmployeeMispunch() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

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
        reqCheckin = new Date(`${date}T${checkinTime}:00`).toISOString()
      }

      if (["checkout_only", "both"].includes(requestType) && checkoutTime) {
        reqCheckout = new Date(`${date}T${checkoutTime}:00`).toISOString()
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-950">
              Request Mispunch Regularization
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Select date and missing punch times for approval by Admin.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Attendance Date
                </label>
                <input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1"
                  required
                />
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
