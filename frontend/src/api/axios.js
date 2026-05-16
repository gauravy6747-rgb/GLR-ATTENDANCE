import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "", // local dev uses Vite proxy; production can point to deployed API
  withCredentials: true, // send cookies
  timeout: 45000
})

// On 401, redirect to login — but NOT for /auth/me (that 401 is expected when not logged in)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCheck = error.config?.url?.includes("/auth/me")
    if (error.response?.status === 401 && !isAuthCheck) {
      localStorage.removeItem("name")
      localStorage.removeItem("role")
      localStorage.removeItem("employee_id")
      window.location.href = "/"
    }
    return Promise.reject(error)
  }
)

export function getApiErrorMessage(error, fallbackMessage) {
  if (error.code === "ECONNABORTED") {
    return "The request took too long. Please check your connection and try again."
  }

  if (!error.response) {
    return import.meta.env.DEV
      ? "Backend is not running. Start the FastAPI server on port 8000."
      : "Could not reach the server. Please check your connection and try again."
  }
  return error.response.data?.detail || fallbackMessage
}

export default api
