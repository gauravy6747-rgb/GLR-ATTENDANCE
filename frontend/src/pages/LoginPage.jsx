import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api, { getApiErrorMessage } from "../api/axios"
import ThemeToggle from "../components/ThemeToggle"

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
    <div
      className="grid min-h-screen place-items-center px-4 py-10 transition-colors duration-300"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Decorative background orbs */}
      <div style={{
        position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", top: "-10%", right: "-5%", width: "400px", height: "400px",
          borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", bottom: "-10%", left: "-5%", width: "350px", height: "350px",
          borderRadius: "50%", background: "radial-gradient(circle, rgba(74,144,217,0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
      </div>

      <div
        className="w-full max-w-md rounded-2xl p-8 scale-in"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-lg)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white shadow-lg pulse-glow">
              GLR
            </div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>
              Sign in
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Access your GLR Attendance workspace.
            </p>
          </div>
          <ThemeToggle />
        </div>
 
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              Email
            </label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none transition-all duration-200"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-accent)"
                e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--color-border)"
                e.target.style.boxShadow = "none"
              }}
              required
            />
          </div>
 
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-xs font-semibold transition-colors duration-200"
                style={{ color: "var(--color-accent)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-accent-hover)" }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-accent)" }}
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
                className="w-full rounded-xl pl-4 pr-12 py-3 outline-none transition-all duration-200"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-accent)"
                  e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--color-border)"
                  e.target.style.boxShadow = "none"
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 transition-colors duration-200"
                style={{ color: "var(--color-text-secondary)" }}
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
            <p className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "var(--color-danger)",
              }}>
              {error}
            </p>
          )}
 
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-5 py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md rounded-2xl p-8 space-y-5 scale-in"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-lg)",
            }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  style={{ color: "var(--color-accent)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>Forgot Password</h3>
            </div>
            
            {resetMessage ? (
              <div className="space-y-4">
                <p className="rounded-xl px-4 py-3 text-sm font-medium"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    color: "var(--color-accent)",
                  }}>
                  {resetMessage}
                </p>
                <button
                  onClick={() => {
                    setShowResetModal(false)
                    setResetMessage("")
                  }}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: "var(--color-text)" }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  Enter your email address and we'll send you a secure link to reset your password.
                </p>
                
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--color-accent)"
                      e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)"
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--color-border)"
                      e.target.style.boxShadow = "none"
                    }}
                    required
                  />
                </div>

                {resetError && (
                  <p className="rounded-xl px-4 py-3 text-sm font-medium"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "var(--color-danger)",
                    }}>
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
                    className="flex-1 rounded-xl py-3 text-sm font-bold transition-all duration-200"
                    style={{
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                      background: "transparent",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
                    }}
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
