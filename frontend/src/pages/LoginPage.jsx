import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api, { getApiErrorMessage } from "../api/axios"

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState("")
  const [resetError, setResetError] = useState("")
 
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

  const handleForgotPassword = async (event) => {
    event.preventDefault()
    setResetLoading(true)
    setResetError("")
    setResetMessage("")

    try {
      const { data } = await api.post("/auth/forgot-password", { email: resetEmail })
      setResetMessage(data.message || "Reset link sent successfully! Check your email.")
      setResetEmail("")
    } catch (err) {
      console.error(err)
      setResetError(getApiErrorMessage(err, "Failed to send reset link"))
    } finally {
      setResetLoading(false)
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-4 pr-12 py-3 text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-gray-700 transition"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>
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

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl space-y-5 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Forgot Password</h3>
            </div>
            
            {resetMessage ? (
              <div className="space-y-4">
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {resetMessage}
                </p>
                <button
                  onClick={() => {
                    setShowResetModal(false)
                    setResetMessage("")
                  }}
                  className="w-full rounded-lg bg-gray-950 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Enter your email address and we'll send you a secure link to reset your password.
                </p>
                
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    required
                  />
                </div>

                {resetError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {resetError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false)
                      setResetError("")
                      setResetEmail("")
                    }}
                    className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {resetLoading ? "Sending..." : "Send Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginPage
