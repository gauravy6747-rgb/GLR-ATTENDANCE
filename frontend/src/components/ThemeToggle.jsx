import { useContext } from "react"
import { ThemeContext } from "../context/ThemeContext.jsx"

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useContext(ThemeContext)
  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`relative inline-flex items-center shrink-0 cursor-pointer rounded-full p-0.5 transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}
      style={{
        width: "52px",
        height: "28px",
        background: isDark
          ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
          : "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(245,158,11,0.35)",
        boxShadow: isDark
          ? "inset 0 1px 3px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.2)"
          : "inset 0 1px 2px rgba(245,158,11,0.25), 0 2px 4px rgba(245,158,11,0.15)",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          background: isDark
            ? "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)"
            : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "#ffffff",
          transform: isDark ? "translateX(24px)" : "translateX(1px)",
          transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: isDark
            ? "0 0 10px rgba(56, 189, 248, 0.6)"
            : "0 0 10px rgba(245, 158, 11, 0.5)",
        }}
      >
        {isDark ? (
          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </span>
    </button>
  )
}

export default ThemeToggle
