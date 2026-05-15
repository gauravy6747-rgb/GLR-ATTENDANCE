import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const API_TARGET = "http://127.0.0.1:8000"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy all API routes through Vite so cookies are same-origin (localhost:5173)
    // This prevents SameSite cookie blocking in development
    proxy: {
      "/auth":                  { target: API_TARGET, changeOrigin: true },
      "/dashboard/admin-stats": { target: API_TARGET, changeOrigin: true },
      "/employees/":            { target: API_TARGET, changeOrigin: true },
      "/attendance/":           { target: API_TARGET, changeOrigin: true },
      "/face":                  { target: API_TARGET, changeOrigin: true },
      "/locations":             { target: API_TARGET, changeOrigin: true },
      "/export":                { target: API_TARGET, changeOrigin: true },
      "/company":               { target: API_TARGET, changeOrigin: true },
      "/leave/":                { target: API_TARGET, changeOrigin: true },
    }
  }
})
