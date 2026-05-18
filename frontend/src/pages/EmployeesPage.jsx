import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import { getEmployees, createEmployee, deleteEmployee } from "../services/employeeService"
import { getApiErrorMessage } from "../api/axios"
import EmployeeStatsDashboard from "../components/EmployeeStatsDashboard"

function formatRole(role) {
  if (!role) return "-"
  return role.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

const emptyForm = {
  employee_id: "",
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "employee"
}

function AddEmployeeModal({ onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose()
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [loading, onClose])

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const created = await createEmployee(form)
      onCreated(created)
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create employee"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-950">Add Employee</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Employee ID</label>
              <input
                value={form.employee_id}
                onChange={set("employee_id")}
                placeholder="EMP-001"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Role</label>
              <select
                value={form.role}
                onChange={set("role")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Full Name</label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="John Doe"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="john@company.com"
              required
              autoComplete="new-email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Phone</label>
              <input
                value={form.phone}
                onChange={set("phone")}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder="Set password"
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
            >
              {loading ? "Adding…" : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)

  const fetchEmployees = () => {
    setLoading(true)
    getEmployees()
      .then((data) => { setEmployees(data); setError("") })
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load employees")))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleCreated = (newEmployee) => {
    setEmployees((prev) => [newEmployee, ...prev])
    setShowModal(false)
  }

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm("Are you sure you want to remove this employee? This will also remove their attendance history.")) return
    
    try {
      await deleteEmployee(id)
      setEmployees((prev) => prev.filter(emp => emp.id !== id))
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to delete employee"))
    }
  }

  return (
    <AdminLayout>
      {showModal && (
        <AddEmployeeModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-950">Employees</h2>
            <p className="mt-1 text-sm text-gray-500">{employees.length} people in the system</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Employee
          </button>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading employees…</p>}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">{error}</p>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[960px] border-collapse">
              <thead>
                <tr className="bg-gray-950 text-white">
                  <th className="w-36 p-4 text-left text-sm font-semibold">Employee ID</th>
                  <th className="w-48 p-4 text-left text-sm font-semibold">Name</th>
                  <th className="w-64 p-4 text-left text-sm font-semibold">Email</th>
                  <th className="w-36 p-4 text-left text-sm font-semibold">Role</th>
                  <th className="w-32 p-4 text-center text-sm font-semibold">Face</th>
                  <th className="w-24 p-4 text-center text-sm font-semibold">Stats</th>
                  <th className="w-24 p-4 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="p-4 text-sm font-semibold text-gray-900">{emp.employee_id}</td>
                    <td className="p-4 text-sm font-medium text-gray-900">{emp.name}</td>
                    <td className="p-4 text-sm text-gray-600">{emp.email}</td>
                    <td className="p-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {formatRole(emp.role)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex min-w-16 justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                        emp.face_enrolled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {emp.face_enrolled ? "Enrolled" : "Pending"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedEmployeeId(emp.id)}
                        className="inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition"
                        title="View Working Stats Dashboard"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                        </svg>
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Delete Employee"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {employees.length === 0 && (
              <p className="p-6 text-sm text-gray-400">No employees found. Add your first employee.</p>
            )}
          </div>
        )}
      </div>
      {/* Stats Modal */}
      {selectedEmployeeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl my-8 relative">
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-xl font-black text-gray-950 mb-6 flex items-center gap-2">
              <span>📈</span> Employee Working Stats Dashboard
            </h3>
            <div className="max-h-[75vh] overflow-y-auto pr-1">
              <EmployeeStatsDashboard user_id={selectedEmployeeId} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default EmployeesPage
