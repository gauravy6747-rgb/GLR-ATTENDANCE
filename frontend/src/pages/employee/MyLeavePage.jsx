import { useEffect, useState } from "react"
import EmployeeLayout from "../../layouts/EmployeeLayout"
import api, { getApiErrorMessage } from "../../api/axios"

function MyLeavePage() {
  const [balance, setBalance] = useState({ available_balance: 0, days_earned: 0, days_used: 0 })
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ start_date: "", end_date: "", reason: "" })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [balRes, reqsRes] = await Promise.all([
        api.get("/leave/balance"),
        api.get("/leave/my-requests")
      ])
      setBalance(balRes.data)
      setRequests(reqsRes.data)
      setError("")
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load leave data"))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError("")
    try {
      await api.post("/leave/request", form)
      setShowModal(false)
      setForm({ start_date: "", end_date: "", reason: "" })
      fetchData() // Refresh list and balance (balance doesn't deduct until approved, but good to refresh)
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to submit request"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-md space-y-6">
        <h2 className="text-2xl font-bold text-gray-950">Leave & Comp-Off</h2>

        {/* Balance Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Available</span>
          </div>
          <p className="text-sm font-semibold text-gray-500">Comp-Off Balance</p>
          <p className="mt-2 text-5xl font-black text-gray-900">{balance.available_balance}</p>
          <p className="mt-1 text-sm text-gray-400">days</p>
          
          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div>
              <p className="font-bold text-emerald-600">+{balance.days_earned}</p>
              <p className="text-[10px] uppercase font-bold text-gray-400">Earned</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="font-bold text-amber-600">-{balance.days_used}</p>
              <p className="text-[10px] uppercase font-bold text-gray-400">Used</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="font-bold text-blue-600">-{balance.days_paid_out || 0}</p>
              <p className="text-[10px] uppercase font-bold text-gray-400">Paid Out</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full rounded-xl bg-emerald-600 py-4 text-base font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95"
        >
          Request Leave
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-gray-500">Loading...</p>}

        {!loading && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Request History</h3>
            {requests.length === 0 && <p className="text-sm text-gray-500">No requests found.</p>}
            
            {requests.map(req => (
              <div key={req.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-gray-900">
                    {new Date(req.start_date).toLocaleDateString()}
                    {req.start_date !== req.end_date && ` - ${new Date(req.end_date).toLocaleDateString()}`}
                  </p>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                    req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{req.reason}</p>
                {req.admin_notes && (
                  <p className="mt-2 rounded bg-gray-50 p-2 text-xs italic text-gray-500">Admin: {req.admin_notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Request Leave</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Start Date</label>
                  <input type="date" required value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">End Date</label>
                  <input type="date" required value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Reason</label>
                <textarea required value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={3} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:border-emerald-500 resize-none" placeholder="Vacation..." />
              </div>

              {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-700">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:bg-emerald-300">{submitting ? "Sending..." : "Submit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EmployeeLayout>
  )
}

export default MyLeavePage
