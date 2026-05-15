import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import api, { getApiErrorMessage } from "../api/axios"

function CompanySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [workingDays, setWorkingDays] = useState({
    monday: true, tuesday: true, wednesday: true,
    thursday: true, friday: true, saturday: false, sunday: false
  })
  const [savingDays, setSavingDays] = useState(false)

  const [holidays, setHolidays] = useState([])
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "", type: "national" })
  const [addingHoliday, setAddingHoliday] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get("/company/working-days"),
      api.get("/company/holidays")
    ])
      .then(([daysRes, holidaysRes]) => {
        setWorkingDays(daysRes.data)
        setHolidays(holidaysRes.data)
        setError("")
      })
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load company config")))
      .finally(() => setLoading(false))
  }, [])

  const handleDayChange = (day) => {
    setWorkingDays(prev => ({ ...prev, [day]: !prev[day] }))
  }

  const saveWorkingDays = async () => {
    setSavingDays(true)
    setError("")
    try {
      await api.put("/company/working-days", workingDays)
      alert("Working days updated successfully!")
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update working days"))
    } finally {
      setSavingDays(false)
    }
  }

  const handleAddHoliday = async (e) => {
    e.preventDefault()
    setAddingHoliday(true)
    setError("")
    try {
      const { data } = await api.post("/company/holidays", newHoliday)
      setHolidays(prev => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)))
      setNewHoliday({ name: "", date: "", type: "national" })
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add holiday"))
    } finally {
      setAddingHoliday(false)
    }
  }

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return
    try {
      await api.delete(`/company/holidays/${id}`)
      setHolidays(prev => prev.filter(h => h.id !== id))
    } catch (err) {
      alert("Failed to delete holiday")
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-950">Company Settings</h2>
          <p className="mt-1 text-sm text-gray-500">Configure working days and public holidays.</p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading settings...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Working Days Config */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Working Days</h3>
              <p className="text-sm text-gray-500 mb-6">
                Employees checking in on unselected days will automatically earn comp-off balance.
              </p>
              
              <div className="space-y-3">
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                  <label key={day} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workingDays[day] || false}
                      onChange={() => handleDayChange(day)}
                      className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={saveWorkingDays}
                disabled={savingDays}
                className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:bg-gray-400"
              >
                {savingDays ? "Saving..." : "Save Working Days"}
              </button>
            </div>

            {/* Holidays List */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Public Holidays</h3>
              
              <form onSubmit={handleAddHoliday} className="mb-6 space-y-4 rounded-xl bg-gray-50 p-4 border border-gray-200">
                <p className="text-sm font-bold text-gray-700">Add New Holiday</p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday(prev => ({...prev, name: e.target.value}))}
                    placeholder="Holiday Name"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday(prev => ({...prev, date: e.target.value}))}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingHoliday}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  {addingHoliday ? "Adding..." : "Add Holiday"}
                </button>
              </form>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {holidays.length === 0 && <p className="text-sm text-gray-500">No holidays added yet.</p>}
                {holidays.map(holiday => (
                  <div key={holiday.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{holiday.name}</p>
                      <p className="text-xs text-gray-500">{new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      className="rounded p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default CompanySettingsPage
