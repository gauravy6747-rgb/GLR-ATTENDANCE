import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import api, { getApiErrorMessage } from "../api/axios"

export default function PayrollPage() {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [payrollData, setPayrollData] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editingSalaryVal, setEditingSalaryVal] = useState("")
  const [savingSalary, setSavingSalary] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const fetchPayroll = () => {
    setLoading(true)
    setError("")
    setSuccessMsg("")
    api.get(`/payroll/summary?year=${year}&month=${month}`)
      .then((res) => {
        setPayrollData(res.data)
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Failed to fetch payroll calculations"))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchPayroll()
  }, [year, month])

  const handleEditSalaryClick = (emp) => {
    setEditingUserId(emp.user_id)
    setEditingSalaryVal(emp.base_salary.toString())
    setError("")
    setSuccessMsg("")
  }

  const handleSaveSalarySubmit = async (e, userId) => {
    e.preventDefault()
    const parsedSalary = parseFloat(editingSalaryVal)
    if (isNaN(parsedSalary) || parsedSalary < 0) {
      setError("Please enter a valid numeric salary amount.")
      return
    }

    setSavingSalary(true)
    setError("")
    setSuccessMsg("")

    try {
      await api.post("/payroll/salary", {
        user_id: userId,
        base_salary: parsedSalary
      })
      setSuccessMsg("Base monthly salary updated successfully!")
      setEditingUserId(null)
      
      // Refresh payroll calculation list
      fetchPayroll()
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update employee salary"))
    } finally {
      setSavingSalary(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i)
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" }
  ]

  const suggestions = (Array.isArray(payrollData?.records) ? payrollData.records : []).filter(r => 
    r?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r?.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const displayedRecords = selectedUserId 
    ? (Array.isArray(payrollData?.records) ? payrollData.records.filter(r => r.user_id === selectedUserId) : [])
    : suggestions

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-950">Payroll & Salaries</h2>
            <p className="text-sm text-gray-500 mt-1">Configure employee monthly base salaries and dynamically evaluate pro-rata payroll disbursements.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500"
              >
                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMsg}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Search or select employee..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedUserId(null)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setShowSuggestions(false)
                  }, 200)
                }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 py-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedUserId(null)
                    setShowSuggestions(false)
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 font-bold transition"
                >
                  ✕
                </button>
              )}

              {/* Suggestions floating list */}
              {showSuggestions && searchQuery && (
                <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg space-y-1">
                  {suggestions.length === 0 ? (
                    <div className="py-2.5 px-3 text-xs font-semibold text-gray-400 italic">
                      No matching employees found
                    </div>
                  ) : (
                    suggestions.map((s) => (
                      <button
                        key={s.user_id}
                        type="button"
                        onClick={() => {
                          setSearchQuery(s.name)
                          setSelectedUserId(s.user_id)
                          setShowSuggestions(false)
                        }}
                        className="w-full text-left rounded-lg py-2.5 px-3 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition flex items-center justify-between"
                      >
                        <span>{s.name}</span>
                        <span className="text-[10px] text-gray-400 font-normal">{s.employee_id}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <div className="rounded-xl bg-gray-50 px-4 py-3 border border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span>📅</span> Working Days in {months.find(m => m.value === month)?.label}:{" "}
              <span className="text-sm font-black text-gray-900 normal-case">{payrollData?.total_working_days || 0} days</span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-sm font-semibold text-gray-400 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              <span>Calculating payroll records...</span>
            </div>
          ) : displayedRecords.length === 0 ? (
            <div className="py-16 text-center text-sm font-medium text-gray-400">
              No employee payroll records found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Employee Details</th>
                    <th className="px-6 py-4">Base Monthly Salary</th>
                    <th className="px-6 py-4 text-center">Worked Days (Status)</th>
                    <th className="px-6 py-4 text-center">Paid Leaves</th>
                    <th className="px-6 py-4 text-center">Total Paid Days</th>
                    <th className="px-6 py-4 text-right">Calculated Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {displayedRecords.map((rec) => {
                    const isEditing = editingUserId === rec.user_id

                    return (
                      <tr key={rec.user_id} className="hover:bg-gray-50 transition duration-150">
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          <div>
                            <p className="text-sm font-bold text-gray-950">{rec.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{rec.employee_id} • {rec.email}</p>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <form onSubmit={(e) => handleSaveSalarySubmit(e, rec.user_id)} className="flex items-center gap-2 max-w-[200px]">
                              <input
                                type="number"
                                step="any"
                                value={editingSalaryVal}
                                onChange={(e) => setEditingSalaryVal(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-bold text-gray-900 outline-none focus:border-emerald-500"
                                required
                                autoFocus
                              />
                              <button
                                type="submit"
                                disabled={savingSalary}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
                              >
                                {savingSalary ? "..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="text-base font-black text-gray-900">
                                ₹{rec.base_salary ? rec.base_salary.toLocaleString("en-IN") : "0"}
                              </span>
                              <button
                                onClick={() => handleEditSalaryClick(rec)}
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                              >
                                Edit Salary
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center font-bold text-gray-900">
                          {rec.worked_days} <span className="text-xs font-normal text-gray-400">days</span>
                        </td>

                        <td className="px-6 py-4 text-center font-semibold text-indigo-700 bg-indigo-50/20">
                          {rec.paid_leaves} <span className="text-xs font-normal text-indigo-400">leaves</span>
                        </td>

                        <td className="px-6 py-4 text-center font-black text-gray-900 bg-gray-50/40">
                          {rec.total_paid_days} <span className="text-xs font-normal text-gray-400">days</span>
                        </td>

                        <td className="px-6 py-4 text-right font-black text-emerald-600 text-lg">
                          ₹{rec.calculated_salary ? rec.calculated_salary.toLocaleString("en-IN") : "0.00"}
                          <p className="text-[10px] text-gray-400 font-semibold tracking-wide mt-0.5 uppercase">
                            ({rec.total_paid_days}/{rec.total_working_days} Days Ratio)
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
