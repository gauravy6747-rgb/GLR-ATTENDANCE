import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api, { getApiErrorMessage } from "../api/axios"

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data } = await api.post("/auth/login", { email, password })

      // JWT is stored in httpOnly cookie by the server
      // We only store display values in localStorage
      login(data)

      // Redirect based on role
      if (data.role === "employee") {
        navigate(data.face_enrolled ? "/home" : "/enroll")
      } else {
        navigate("/dashboard")
      }
    } catch (err) {
      console.error(err)
      setError(getApiErrorMessage(err, "Login failed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7f9] px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            GLR
          </div>
          <h1 className="text-3xl font-bold text-gray-950">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Access your GLR Attendance workspace.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
