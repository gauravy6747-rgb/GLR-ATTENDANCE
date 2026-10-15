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
      fetchData()
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to submit request"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-md space-y-6 pb-10 fade-in">
        <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--color-text)" }}>
          Leave & Comp-Off
        </h2>

        {/* Balance Card */}
        <div
          className="rounded-3xl p-6 text-center relative overflow-hidden border shadow-lg transition-colors duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(56, 189, 248, 0.05) 100%), var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="absolute top-4 right-4">
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}
            >
              Available
            </span>
          </div>

          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
            Comp-Off Balance
          </p>
          <p className="mt-2 text-5xl font-black tracking-tight" style={{ color: "var(--color-text)" }}>
            {balance.available_balance}
          </p>
          <p className="mt-1 text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            days available
          </p>
          
          <div
            className="mt-6 flex items-center justify-center gap-6 text-sm border-t pt-4"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div>
              <p className="font-extrabold text-emerald-500">+{balance.days_earned}</p>
              <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Earned</p>
            </div>
            <div className="h-7 w-px" style={{ background: "var(--color-border)" }} />
            <div>
              <p className="font-extrabold text-amber-500">-{balance.days_used}</p>
              <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Used</p>
            </div>
            <div className="h-7 w-px" style={{ background: "var(--color-border)" }} />
            <div>
              <p className="font-extrabold text-sky-500">-{balance.days_paid_out || 0}</p>
              <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Paid Out</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-95"
        >
          + Request Leave / Comp-Off
        </button>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-500">
            {error}
          </p>
        )}
        {loading && <p className="text-sm py-4 text-center" style={{ color: "var(--color-text-secondary)" }}>Loading leave data...</p>}

        {!loading && (
          <div className="space-y-3">
            <h3 className="text-base font-extrabold" style={{ color: "var(--color-text)" }}>
              Request History
            </h3>
            {requests.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: "var(--color-text-secondary)" }}>
                No leave requests found.
              </p>
            )}
            
            {requests.map(req => (
              <div
                key={req.id}
                className="rounded-2xl p-4 shadow-sm border transition-all hover:scale-[1.01]"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-extrabold text-sm" style={{ color: "var(--color-text)" }}>
                    {new Date(req.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    {req.start_date !== req.end_date && ` — ${new Date(req.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                    req.status === 'approved' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' :
                    req.status === 'rejected' ? 'bg-red-500/15 text-red-500 border border-red-500/30' :
                    'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{req.reason}</p>
                {req.admin_notes && (
                  <p
                    className="mt-2 rounded-lg p-2.5 text-xs italic border"
                    style={{ background: "var(--color-surface-raised)", borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                  >
                    Admin note: {req.admin_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border space-y-4 transition-colors duration-300"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>Request Leave</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-1.5 hover:opacity-70"
                style={{ color: "var(--color-text-secondary)" }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1"
                    style={{ color: "var(--color-text-secondary)" }}>Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={e => setForm({...form, start_date: e.target.value})}
                    className="w-full rounded-xl p-2.5 text-sm outline-none transition"
                    style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1"
                    style={{ color: "var(--color-text-secondary)" }}>End Date</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={e => setForm({...form, end_date: e.target.value})}
                    className="w-full rounded-xl p-2.5 text-sm outline-none transition"
                    style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1"
                  style={{ color: "var(--color-text-secondary)" }}>Reason</label>
                <textarea
                  required
                  value={form.reason}
                  onChange={e => setForm({...form, reason: e.target.value})}
                  rows={3}
                  className="w-full rounded-xl p-2.5 text-sm outline-none transition resize-none"
                  style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                  placeholder="Family occasion, health reasons..."
                />
              </div>

              {formError && <p className="text-xs font-semibold text-red-500">{formError}</p>}

              <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl py-3 text-xs font-bold border transition hover:opacity-80"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EmployeeLayout>
  )
}

export default MyLeavePage
