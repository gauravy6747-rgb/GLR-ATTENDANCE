import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import { getAllMispunchRequests, actionMispunchRequest } from "../services/mispunchService"
import { getApiErrorMessage } from "../api/axios"

function MispunchRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [searchTerm, setSearchTerm] = useState("")
  const [actionModal, setActionModal] = useState({ open: false, req: null, actionType: "approve", notes: "" })
  const [submittingAction, setSubmittingAction] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const data = await getAllMispunchRequests()
      setRequests(data)
      setError("")
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load mispunch requests"))
    } finally {
      setLoading(false)
    }
  }

  const openActionModal = (req, actionType) => {
    setActionModal({
      open: true,
      req,
      actionType,
      notes: ""
    })
  }

  const handleActionSubmit = async (e) => {
    e.preventDefault()
    if (!actionModal.req) return

    setSubmittingAction(true)
    try {
      const updatedReq = await actionMispunchRequest(actionModal.req.id, {
        action: actionModal.actionType,
        notes: actionModal.notes
      })
      setRequests(prev => prev.map(r => r.id === actionModal.req.id ? updatedReq : r))
      setActionModal({ open: false, req: null, actionType: "approve", notes: "" })
    } catch (err) {
      alert(getApiErrorMessage(err, `Failed to ${actionModal.actionType} request`))
    } finally {
      setSubmittingAction(false)
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return "N/A"
    const d = new Date(timeStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const safeRequests = Array.isArray(requests) ? requests : []

  const filteredRequests = safeRequests.filter(req => {
    if (!req) return false
    const matchesTab = activeTab === "all" ? true : req.status === activeTab
    const matchesSearch = searchTerm === "" ||
      req.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesTab && matchesSearch
  })

  const pendingCount = safeRequests.filter(r => r && r.status === "pending").length

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-950">Mispunch Regularization Requests</h2>
            <p className="mt-1 text-sm text-gray-500">
              Review and approve or reject employee missed check-in and check-out requests.
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 border border-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              {pendingCount} Pending Request{pendingCount > 1 ? "s" : ""} Awaiting Review
            </div>
          )}
        </div>

        {/* Filter Bar & Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-lg bg-gray-100 p-1 text-xs font-semibold">
            {["pending", "approved", "rejected", "all"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-4 py-2 capitalize transition ${
                  activeTab === tab
                    ? "bg-white text-gray-950 shadow-sm font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab}
                {tab === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by employee or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Attendance Date</th>
                  <th className="p-4">Request Type</th>
                  <th className="p-4">Requested Times</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500">
                      No mispunch requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-4">
                        <div className="font-bold text-gray-950">{req.employee_name}</div>
                        {req.employee_code && (
                          <div className="text-xs text-gray-500">Code: {req.employee_code}</div>
                        )}
                      </td>
                      <td className="p-4 font-medium text-gray-900">
                        {formatDate(req.date)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                          req.request_type === "both" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                          req.request_type === "checkin_only" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                          "bg-orange-50 text-orange-700 border border-orange-200"
                        }`}>
                          {req.request_type === "both" ? "Check-in & Check-out" :
                           req.request_type === "checkin_only" ? "Check-in Only" : "Check-out Only"}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-medium text-gray-800">
                        {["checkin_only", "both"].includes(req.request_type) && (
                          <div>
                            <span className="text-gray-500 font-normal">In: </span>
                            <span className="font-semibold text-emerald-700">{formatTime(req.requested_checkin_time)}</span>
                          </div>
                        )}
                        {["checkout_only", "both"].includes(req.request_type) && (
                          <div>
                            <span className="text-gray-500 font-normal">Out: </span>
                            <span className="font-semibold text-amber-700">{formatTime(req.requested_checkout_time)}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-xs text-gray-700 line-clamp-2" title={req.reason}>
                          {req.reason}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          Submitted {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                        {req.admin_notes && (
                          <p className="mt-1 text-[11px] text-gray-500 italic max-w-xs truncate" title={req.admin_notes}>
                            Note: {req.admin_notes}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openActionModal(req, "approve")}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openActionModal(req, "reject")}
                              className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            Processed by {req.action_by_name || "Admin"}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Modal */}
        {actionModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-bold text-gray-950 capitalize">
                {actionModal.actionType} Mispunch Request
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Employee: <span className="font-semibold text-gray-900">{actionModal.req?.employee_name}</span> ({formatDate(actionModal.req?.date)})
              </p>

              <form onSubmit={handleActionSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Admin Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={actionModal.notes}
                    onChange={(e) => setActionModal(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={`Reason for ${actionModal.actionType}ing...`}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionModal({ open: false, req: null, actionType: "approve", notes: "" })}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
                      actionModal.actionType === "approve"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-red-600 hover:bg-red-700"
                    } ${submittingAction ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {submittingAction ? "Processing..." : `Confirm ${actionModal.actionType}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default MispunchRequestsPage
