import { createContext, useContext, useEffect, useState } from "react"
import api from "../api/axios"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verify cookie is valid by hitting /auth/me
    api.get("/auth/me")
      .then((res) => {
        if (!res.data || typeof res.data !== "object" || !res.data.role) {
          throw new Error("Invalid auth response")
        }

        setUser(res.data)
        // Keep display values in sync with server
        localStorage.setItem("name", res.data.name)
        localStorage.setItem("role", res.data.role)
        localStorage.setItem("employee_id", res.data.employee_id)
      })
      .catch(() => {
        setUser(null)
        localStorage.removeItem("name")
        localStorage.removeItem("role")
        localStorage.removeItem("employee_id")
      })
      .finally(() => setLoading(false))
  }, [])

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem("name", userData.name)
    localStorage.setItem("role", userData.role)
    localStorage.setItem("employee_id", userData.employee_id)
  }

  const logout = async () => {
    try {
      await api.post("/auth/logout")
    } catch (_) {
      // ignore
    }
    setUser(null)
    localStorage.removeItem("name")
    localStorage.removeItem("role")
    localStorage.removeItem("employee_id")
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
