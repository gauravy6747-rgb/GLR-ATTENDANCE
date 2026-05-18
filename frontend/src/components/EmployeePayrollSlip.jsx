import { useEffect, useState } from "react"
import api, { getApiErrorMessage } from "../api/axios"

export default function EmployeePayrollSlip() {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [slip, setSlip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchSlip = () => {
    setLoading(true)
    setError("")
    api.get(`/payroll/my-slip?year=${year}&month=${month}`)
      .then((res) => {
        setSlip(res.data)
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Failed to load payroll slip"))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchSlip()
  }, [year, month])

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

  return (
    <div className="space-y-5">
      {/* Date Selectors */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-700 outline-none transition focus:border-emerald-500 focus:bg-white"
            >
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs font-semibold text-gray-400 flex flex-col items-center justify-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <span>Generating pay slip...</span>
        </div>
      ) : slip && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">GLR Attendance Slip</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                {months.find(m => m.value === month)?.label} {year}
              </p>
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">
              Pro-rata Slip
            </span>
          </div>

          <div className="space-y-4">
            {/* Net salary disbursement */}
            <div className="rounded-xl bg-emerald-50/50 p-4 border border-emerald-100 text-center">
              <p className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Estimated Net Payout</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">
                ₹{slip.calculated_salary ? slip.calculated_salary.toLocaleString("en-IN") : "0.00"}
              </p>
              <p className="text-[9px] text-gray-400 font-semibold uppercase mt-1">
                Based on {slip.total_paid_days} paid days out of {slip.total_working_days} working days
              </p>
            </div>

            {/* Calculations items grid */}
            <div className="grid gap-3 pt-2">
              <div className="flex justify-between items-center rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase">Base Monthly Salary</span>
                <span className="text-sm font-black text-gray-900">
                  ₹{slip.base_salary ? slip.base_salary.toLocaleString("en-IN") : "0"}
                </span>
              </div>

              <div className="flex justify-between items-center rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase">Working Days</span>
                <span className="text-sm font-black text-gray-900">{slip.total_working_days} days</span>
              </div>

              <div className="flex justify-between items-center rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase">Worked Days Count</span>
                <span className="text-sm font-black text-gray-900">{slip.worked_days} days</span>
              </div>

              <div className="flex justify-between items-center rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase">Comp-Off Paid Leaves</span>
                <span className="text-sm font-black text-indigo-700">{slip.paid_leaves} leaves</span>
              </div>

              <div className="flex justify-between items-center rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase">Total Paid Days</span>
                <span className="text-sm font-black text-gray-900">{slip.total_paid_days} days</span>
              </div>
            </div>

            {/* Salary calculation description */}
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-[10px] text-gray-400 font-semibold leading-relaxed space-y-1">
              <p className="uppercase tracking-wider text-gray-900">💡 Calculation Logic</p>
              <p>1. Your base monthly salary is decided first by the administrator.</p>
              <p>2. Calculated Salary = (Base Monthly Salary / Total Working Days in Month) * Total Paid Days.</p>
              <p>3. Paid Days includes full days worked, half days worked (0.5 days each), and paid comp-off leaves taken.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
