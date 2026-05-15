import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import api, { getApiErrorMessage } from "../api/axios"

function LeaveRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const { data } = await api.get("/leave/all")
      setRequests(data)
      setError("")
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load requests"))
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, action) => {
    const notes = window.prompt(`Add note for ${action}ing this request (optional):`)
    if (notes === null) return // cancelled

    try {
      const { data } = await api.post(`/leave/${id}/action`, { action, notes })
      setRequests(prev => prev.map(r => r.id === id ? data : r))
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to perform action"))
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-950">Leave Requests</h2>
          <p className="mt-1 text-sm text-gray-500">Manage employee comp-off requests.</p>
        </div>

        {error && <p className="text-red-600">{error}</p>}
        {loading && <p className="text-gray-500">Loading...</p>}

        {!loading && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-4 font-semibold">Employee</th>
                  <th className="p-4 font-semibold">Dates</th>
                  <th className="p-4 font-semibold">Reason</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.length === 0 && (
                  <tr><td colSpan="5" className="p-6 text-center text-gray-500">No requests found.</td></tr>
                )}
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-900">{req.employee_name}</td>
                    <td className="p-4">
                      {new Date(req.start_date).toLocaleDateString()} 
                      {req.start_date !== req.end_date && ` to ${new Date(req.end_date).toLocaleDateString()}`}
                    </td>
                    <td className="p-4 text-gray-600 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {req.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(req.id, "approve")} className="rounded bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-200">Approve</button>
                          <button onClick={() => handleAction(req.id, "reject")} className="rounded bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200">Reject</button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default LeaveRequestsPage
