import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import api, { getApiErrorMessage } from "../api/axios"

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

function formatHours(value) {
  const totalHours = Number(value ?? 0)
  const hrs = Math.floor(totalHours)
  const mins = Math.round((totalHours - hrs) * 60)
  const finalMins = mins === 60 ? 0 : mins
  const finalHrs = mins === 60 ? hrs + 1 : hrs
  return `${finalHrs}h ${finalMins}m`
}

export default function PayrollPage() {
  const ist = getISTComponents()
  
  const [year, setYear] = useState(ist.year)
  const [month, setMonth] = useState(ist.month)
  const [payrollData, setPayrollData] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [editingEmp, setEditingEmp] = useState(null)
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
    setEditingEmp(emp)
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
        base_salary: parsedSalary,
        year: year,
        month: month
      })
      setSuccessMsg("Base monthly salary updated successfully!")
      setEditingEmp(null)
      
      // Refresh payroll calculation list
      fetchPayroll()
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update employee salary"))
    } finally {
      setSavingSalary(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => ist.year - i)
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
                    <th className="px-6 py-4 text-center">Total Hours</th>
                    <th className="px-6 py-4 text-center">Paid Leaves</th>
                    <th className="px-6 py-4 text-center">Total Paid Days</th>
                    <th className="px-6 py-4 text-right">Calculated Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {displayedRecords.map((rec) => {
                    return (
                      <tr key={rec.user_id} className="hover:bg-gray-50 transition duration-150">
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          <div>
                            <p className="text-sm font-bold text-gray-950">{rec.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{rec.employee_id} • {rec.email}</p>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-gray-900">
                              ₹{rec.base_salary ? rec.base_salary.toLocaleString("en-IN") : "0"}
                            </span>
                            <button
                              onClick={() => handleEditSalaryClick(rec)}
                              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition shadow-sm"
                            >
                              Edit Salary
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center font-bold text-gray-900">
                          {rec.worked_days} <span className="text-xs font-normal text-gray-400">days</span>
                        </td>

                        <td className="px-6 py-4 text-center font-bold text-emerald-700 bg-emerald-50/10">
                          {formatHours(rec.total_hours_worked || 0)}
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

      {/* Edit Salary Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-950">Update Base Salary</h3>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">
                  {editingEmp.name} ({editingEmp.employee_id})
                </p>
              </div>
              <button
                onClick={() => setEditingEmp(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Stats Breakdown inside Modal */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-semibold text-gray-600">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Worked Days</span>
                <span className="text-sm font-black text-gray-900">{editingEmp.worked_days} days</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Paid Leaves</span>
                <span className="text-sm font-black text-indigo-700">{editingEmp.paid_leaves} leaves</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Paid Days</span>
                  <span className="text-sm font-black text-gray-950">{editingEmp.total_paid_days} / {editingEmp.total_working_days} working days</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Live Pro-rata Payout</span>
                  <span className="text-sm font-black text-emerald-600">
                    ₹{((parseFloat(editingSalaryVal) || 0) / editingEmp.total_working_days * editingEmp.total_paid_days).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => handleSaveSalarySubmit(e, editingEmp.user_id)} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500 tracking-wide">Base Monthly Salary (₹)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Enter base monthly salary..."
                    value={editingSalaryVal}
                    onChange={(e) => setEditingSalaryVal(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSalary}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:bg-emerald-300"
                >
                  {savingSalary ? "Saving Changes..." : "Save Salary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
