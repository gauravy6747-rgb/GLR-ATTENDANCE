import { useEffect, useState } from "react"
import { getMonthlyNoteWindowInfo, submitMonthlyNote } from "../services/monthlyNoteService"
import { getApiErrorMessage } from "../api/axios"

export default function MonthlyIssueNoteCard() {
  const [windowInfo, setWindowInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState("")
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [error, setError] = useState("")

  const fetchWindowInfo = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getMonthlyNoteWindowInfo()
      setWindowInfo(data)
      if (data.existing_note) {
        setNoteText(data.existing_note)
      } else {
        setNoteText("")
      }
    } catch (err) {
      console.error("Failed to fetch monthly note window info", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWindowInfo()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!noteText.trim()) {
      setError("Please type a message before saving.")
      return
    }

    setSaving(true)
    setError("")
    setSuccessMsg("")

    try {
      const updated = await submitMonthlyNote(noteText.trim())
      setSuccessMsg("Your message for " + (windowInfo?.target_month_name || "the previous month") + " has been saved!")
      setWindowInfo((prev) => prev ? { ...prev, existing_note: updated.note, updated_at: updated.updated_at } : prev)
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save monthly message"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  // Render strictly during Days 1 to 5 of the month as requested
  if (!windowInfo || !windowInfo.is_open) return null

  const isEditing = !!windowInfo.existing_note

  return (
    <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 p-5 shadow-sm space-y-4 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-sm shadow-indigo-600/20">
            📝
          </div>
          <div>
            <h4 className="text-base font-extrabold text-gray-950">
              {windowInfo.target_month_name} {windowInfo.target_year} Attendance Issue Note
            </h4>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Leave a note for any attendance discrepancies in {windowInfo.target_month_name}. This message will be included in the monthly report for admin review.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-1 text-[10px] font-bold text-indigo-800 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
          Window Open (Day 1–5)
        </span>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
          <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Message for {windowInfo.target_month_name}
          </label>
          <textarea
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={`Explain any attendance issues or reasons for missing punches/hours in ${windowInfo.target_month_name}...`}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 resize-none shadow-inner"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-gray-400 font-medium">
            {isEditing ? (
              <span className="text-indigo-700 font-semibold">✓ Note submitted (editable until Day 5)</span>
            ) : (
              <span>Available to submit until 5th of this month</span>
            )}
          </p>

          <button
            type="submit"
            disabled={saving || !noteText.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 active:scale-95 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? "Update Message" : "Submit Message"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
