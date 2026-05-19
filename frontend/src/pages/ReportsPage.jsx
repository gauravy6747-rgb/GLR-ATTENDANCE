import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import { downloadAttendanceReport } from "../services/reportService"
import { getEmployees } from "../services/employeeService"
import { getApiErrorMessage } from "../api/axios"

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

export default function ReportsPage() {
  const ist = getISTComponents()
  
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [scope, setScope] = useState("all") // all | date | month
  
  const [selectedDate, setSelectedDate] = useState(ist.dateStr)
  const [selectedYear, setSelectedYear] = useState(ist.year)
  const [selectedMonth, setSelectedMonth] = useState(ist.month)
  
  const [downloading, setDownloading] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    getEmployees()
      .then((data) => {
        setEmployees(data)
        setError("")
      })
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load employees list")))
      .finally(() => setLoadingEmployees(false))
  }, [])

  const handleDownload = async (e) => {
    e.preventDefault()
    setDownloading(true)
    setError("")

    const filters = {}
    
    // Employee filter
    if (selectedEmployee) {
      filters.employee_id = selectedEmployee
    }

    // Scope filter
    if (scope === "date") {
      filters.query_date = selectedDate
    } else if (scope === "month") {
      filters.year = selectedYear
      filters.month = selectedMonth
    }

    try {
      const reportBlob = await downloadAttendanceReport(filters)
      const url = window.URL.createObjectURL(reportBlob)
      const link = document.createElement("a")

      // Dynamic descriptive name
      let filename = "attendance_report"
      if (selectedEmployee) {
        const emp = employees.find(e => e.employee_id === selectedEmployee || e.id === selectedEmployee)
        if (emp) filename += `_${emp.name.replace(/\s+/g, "_").toLowerCase()}`
      }
      if (scope === "date") {
        filename += `_${selectedDate}`
      } else if (scope === "month") {
        filename += `_${selectedYear}_${selectedMonth}`
      } else {
        filename += "_all_time"
      }
      filename += ".xlsx"

      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (downloadError) {
      console.error(downloadError)
      setError(getApiErrorMessage(downloadError, "Failed to download attendance report"))
    } finally {
      setDownloading(false)
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-gray-950">Export Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Configure filters to export customized attendance logs to Microsoft Excel.</p>
        </div>

        <form onSubmit={handleDownload} className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-950 border-b border-gray-100 pb-3 flex items-center gap-2">
            <span>📊</span> Excel Export Configurations
          </h3>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Employee Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Target Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              disabled={loadingEmployees}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white"
            >
              <option value="">All Employees (Complete Summary)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.employee_id}>
                  {emp.name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Scope Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Timeframe Scope</label>
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-full sm:w-max">
              {[
                { value: "all", label: "All Time" },
                { value: "date", label: "Specific Day" },
                { value: "month", label: "Specific Month" }
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setScope(item.value)}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition flex-1 sm:flex-initial ${
                    scope === item.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Scopes */}
          {scope === "date" && (
            <div className="space-y-2 rounded-xl bg-gray-50 p-4 border border-gray-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500"
              />
            </div>
          )}

          {scope === "month" && (
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-emerald-500"
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={downloading}
              className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 flex items-center justify-center gap-2 shadow-sm shadow-emerald-200"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating Report...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download Attendance Sheet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
