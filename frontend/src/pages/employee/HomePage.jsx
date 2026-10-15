import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import EmployeeLayout from "../../layouts/EmployeeLayout"
import { getTodayAttendance, getMyHistory, checkin, checkout } from "../../services/attendanceService"
import { submitMispunchRequest, getMyMispunchRequests } from "../../services/mispunchService"
import AttendanceCalendar from "../../components/AttendanceCalendar"
import MonthlyIssueNoteCard from "../../components/MonthlyIssueNoteCard"
import api, { getApiErrorMessage } from "../../api/axios"

function getGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by your browser."))
      return
    }
    
    // Attempt with high accuracy first
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        if (err.code === err.TIMEOUT) {
          console.warn("High accuracy GPS timed out. Trying low accuracy fallback...")
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err2) => reject(getGPSError(err2)),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          )
        } else {
          reject(getGPSError(err))
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  })
}

function getGPSError(err) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  
  if (err.code === err.PERMISSION_DENIED) {
    if (isIOS) {
      return new Error(
        "Location permission is blocked. Please enable it in your iPhone settings:\n" +
        "1. Go to iPhone Settings > Privacy & Security > Location Services (make sure it's ON).\n" +
        "2. Select Safari (or your browser) and change settings to 'Allow' or 'Ask'.\n" +
        "3. If using PWA, go to Settings > PWA App Name > Location > Allow."
      )
    }
    return new Error("Location permission is blocked. Please enable location permissions for this website in your browser settings and try again.")
  } else if (err.code === err.TIMEOUT) {
    return new Error("Location request timed out. Please turn ON your device's location/GPS, move near an open area, and try again.")
  } else {
    return new Error("Unable to retrieve your location. Please check if device GPS is enabled and try again.")
  }
}

function formatTime(value) {
  if (!value) return "--:--"
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatHours(value) {
  const totalHours = Number(value ?? 0)
  const hrs = Math.floor(totalHours)
  const mins = Math.round((totalHours - hrs) * 60)
  const finalMins = mins === 60 ? 0 : mins
  const finalHrs = mins === 60 ? hrs + 1 : hrs
  return `${finalHrs}h ${finalMins}m`
}

function StatusBadge({ status }) {
  const map = {
    full_day: { label: "Full Day", bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
    half_day: { label: "Half Day", bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
    present: { label: "Present", bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
    on_time: { label: "On Time", bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
    late: { label: "Late", bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
    early_bird: { label: "Early Bird", bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
    early_leave: { label: "Early Leave", bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
    on_time_out: { label: "On Time Out", bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  }
  const s = map[status] || { label: status || "Pending", bg: "rgba(156, 163, 175, 0.15)", text: "#9ca3af", border: "rgba(156, 163, 175, 0.3)" }
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Live Digital Clock state
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(clockTimer)
  }, [])

  // Calculate WFH Saturday status
  const todayDate = new Date()
  const isSaturday = todayDate.getDay() === 6
  const dayOfMonth = todayDate.getDate()
  const saturdayIndex = Math.floor((dayOfMonth - 1) / 7) + 1

  const isWfhToday = isSaturday && (
    user?.saturday_policy === "all_sat_wfh" ||
    (user?.saturday_policy === "alt_sat_holiday_rest_wfh" && saturdayIndex !== 2 && saturdayIndex !== 4)
  )

  const [today, setToday] = useState(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState(null)
  const [step, setStep] = useState("idle")
  const [countdown, setCountdown] = useState(null)
  const [note, setNote] = useState("")
  const [mood, setMood] = useState("neutral")
  const [moodNote, setMoodNote] = useState("")
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [stream, setStream] = useState(null)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const [deferredPrompt, setDeferredPrompt] = useState(window.deferredPrompt || null)
  const [isAppInstalled, setIsAppInstalled] = useState(false)

  useEffect(() => {
    const handleBeforePrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      window.deferredPrompt = e
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      window.deferredPrompt = null
      setIsAppInstalled(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforePrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setIsAppInstalled(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforePrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setDeferredPrompt(null)
      window.deferredPrompt = null
    }
  }

  const fetchToday = () => {
    setLoading(true)
    getTodayAttendance()
      .then((data) => {
        if (data?.message === "No attendance today") {
          setToday(null)
        } else {
          setToday(data)
        }
      })
      .catch(() => setToday(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user && !user.face_enrolled) {
      navigate("/enroll", { replace: true })
      return
    }

    let ignore = false
    getTodayAttendance()
      .then((data) => {
        if (ignore) return
        if (data?.message === "No attendance today") {
          setToday(null)
        } else {
          setToday(data)
        }
      })
      .catch(() => {
        if (!ignore) setToday(null)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [user, navigate])

  // Live Timer for Active Check-in Session
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!today?.checkin_time || !today?.is_checked_in) {
      setElapsedSeconds(0)
      return
    }

    const updateTimer = () => {
      const checkinDt = new Date(today.checkin_time)
      const now = new Date()
      const diff = Math.max(0, Math.floor((now.getTime() - checkinDt.getTime()) / 1000))
      setElapsedSeconds(diff)
    }

    updateTimer()
    const timerInterval = setInterval(updateTimer, 1000)
    return () => clearInterval(timerInterval)
  }, [today])

  const targetShiftHours = (isSaturday && user?.saturday_policy === "all_sat_half_day") ? 6.5 : 8.5
  const displayTargetShiftHours = (isSaturday && user?.saturday_policy === "all_sat_half_day") ? 7 : 9
  const targetShiftSeconds = targetShiftHours * 3600
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetShiftSeconds) * 100))
  const remainingSeconds = Math.max(0, targetShiftSeconds - elapsedSeconds)

  // Calendar state for Home page
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarRecords, setCalendarRecords] = useState([])
  const [calendarHolidays, setCalendarHolidays] = useState([])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const nextCalendarMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
  const prevCalendarMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))

  useEffect(() => {
    Promise.all([
      getMyHistory(),
      api.get("/company/holidays")
    ])
      .then(([history, hols]) => {
        setCalendarRecords(Array.isArray(history) ? history : [])
        setCalendarHolidays(Array.isArray(hols?.data) ? hols.data : [])
      })
      .catch(() => {})
  }, [])

  // Mispunch state
  const [mispunchRequests, setMispunchRequests] = useState([])
  const [showMispunchModal, setShowMispunchModal] = useState(false)
  const [mispunchDate, setMispunchDate] = useState(new Date().toISOString().split("T")[0])
  const [mispunchType, setMispunchType] = useState("checkout_only")
  const [mispunchCheckin, setMispunchCheckin] = useState("09:30")
  const [mispunchCheckout, setMispunchCheckout] = useState("18:00")
  const [mispunchReason, setMispunchReason] = useState("")
  const [mispunchSubmitting, setMispunchSubmitting] = useState(false)

  useEffect(() => {
    getMyMispunchRequests()
      .then((reqs) => setMispunchRequests(Array.isArray(reqs) ? reqs : []))
      .catch(() => setMispunchRequests([]))
  }, [])

  const handleMispunchSubmit = async (e) => {
    e.preventDefault()
    if (!mispunchReason.trim()) {
      alert("Please provide a reason for the mispunch request.")
      return
    }

    setMispunchSubmitting(true)
    try {
      let reqCheckin = null
      let reqCheckout = null

      if (["checkin_only", "both"].includes(mispunchType) && mispunchCheckin) {
        reqCheckin = `${mispunchDate}T${mispunchCheckin}:00`
      }

      if (["checkout_only", "both"].includes(mispunchType) && mispunchCheckout) {
        reqCheckout = `${mispunchDate}T${mispunchCheckout}:00`
      }

      const payload = {
        date: mispunchDate,
        request_type: mispunchType,
        requested_checkin_time: reqCheckin,
        requested_checkout_time: reqCheckout,
        reason: mispunchReason.trim()
      }

      const newReq = await submitMispunchRequest(payload)
      const currentList = Array.isArray(mispunchRequests) ? mispunchRequests : []
      setMispunchRequests([newReq, ...currentList])
      setSuccessMsg("Mispunch regularization request submitted successfully!")
      setShowMispunchModal(false)
      setMispunchReason("")
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to submit mispunch request"))
    } finally {
      setMispunchSubmitting(false)
    }
  }

  const pendingMispunchCount = Array.isArray(mispunchRequests)
    ? mispunchRequests.filter(r => r && r.status === "pending").length
    : 0

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }

  const openCamera = async () => {
    setError("")
    setCapturedPhoto(null)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      })
      setStream(mediaStream)
      setStep("camera")
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream
      }, 100)
    } catch (exc) {
      console.error("Camera access failed:", exc)
      if (isIOS) {
        setError(
          "Camera access is blocked. Please enable camera access in your iPhone settings:\n" +
          "1. Go to iPhone Settings > Safari (or your browser) > Camera > select 'Allow'.\n" +
          "2. If using PWA, go to Settings > PWA App Name > Camera > Allow."
        )
      } else {
        setError("Camera access is required for face verification. Please allow camera permissions in browser settings.")
      }
      setStep("note")
    }
  }

  const startFlow = async (actionType) => {
    setAction(actionType)
    setNote("")
    setMood("neutral")
    setMoodNote("")
    if (isWfhToday) {
      setCapturedPhoto(null)
      setStep("note")
    } else {
      await openCamera()
    }
  }

  // Auto-capture logic
  useEffect(() => {
    let timer
    if (step === "camera") {
      setCountdown(3)
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setTimeout(captureAndProceed, 0)
            return null
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [step])

  const captureAndProceed = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height)
    setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.85))
    stopCamera()
    setStep("note")
  }

  const submit = async () => {
    setStep("submitting")
    setError("")
    try {
      const coords = isWfhToday ? { latitude: 0.0, longitude: 0.0 } : await getGPS()
      if (action === "checkin") {
        await checkin(coords.latitude, coords.longitude, note || null, capturedPhoto, mood, moodNote || null)
      } else {
        await checkout(coords.latitude, coords.longitude, note || null, capturedPhoto, mood, moodNote || null)
      }
      setSuccessMsg(action === "checkin" ? "Checked in successfully! Have a great day!" : "Checked out successfully! See you tomorrow!")
      setStep("idle")
      fetchToday()
    } catch (err) {
      setError(getApiErrorMessage(err, "Something went wrong. Please try again."))
      setStep("note")
    }
  }

  const cancel = () => {
    stopCamera()
    setStep("idle")
    setAction(null)
    setError("")
    setMood("neutral")
    setMoodNote("")
  }

  // ── Camera step with Futuristic Biometric Laser Animation ────────────────
  if (step === "camera") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black text-white h-[100dvh]">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 z-20 backdrop-blur-md bg-black/40">
          <button
            onClick={cancel}
            className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/20 transition"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-live-dot" />
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Biometric Scan Active
            </p>
          </div>
          <div className="w-16" />
        </div>

        {/* Viewfinder area */}
        <div className="relative flex-1 overflow-hidden bg-black flex flex-col justify-center items-center">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
          
          {/* Darkened overlay mask with oval cutout */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative h-72 w-56 rounded-full border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {/* Concentric subtle radar pulse */}
              <div className="absolute inset-0 rounded-full border border-emerald-400/40 animate-radar" />

              {/* Scanning laser beam */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_12px_#34d399] animate-laser" />

              {/* Holographic corner markers */}
              <div className="absolute -top-3 -left-3 h-5 w-5 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute -top-3 -right-3 h-5 w-5 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute -bottom-3 -left-3 h-5 w-5 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute -bottom-3 -right-3 h-5 w-5 border-b-2 border-r-2 border-emerald-400" />
            </div>
          </div>

          <p className="absolute bottom-28 w-full text-center text-xs font-medium text-white/90 drop-shadow-md z-10 tracking-wide">
            Align your face inside the green frame
          </p>

          {/* Countdown indicator */}
          {countdown !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-black/60 backdrop-blur-md border border-emerald-400/50 shadow-2xl scale-in">
                <span className="text-5xl font-black text-emerald-400 drop-shadow-lg">{countdown}</span>
              </div>
              <span className="mt-3 text-xs font-bold tracking-widest uppercase text-white/80 drop-shadow">
                Auto-capturing...
              </span>
            </div>
          )}

          {/* Manual capture button */}
          <div className="absolute bottom-8 left-0 right-0 px-6 z-20 max-w-sm mx-auto">
            <button
              onClick={() => {
                setCountdown(null)
                captureAndProceed()
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Capture Face Now
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // ── Note + submit step ───────────────────────────────────────────────────
  if (step === "note" || step === "submitting") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col h-[100dvh] transition-colors duration-300"
        style={{ background: "var(--color-bg)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 backdrop-blur-md border-b transition-colors duration-300"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <button onClick={cancel} className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition hover:opacity-80"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            Cancel
          </button>
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            Confirm {action === "checkin" ? "Check In" : "Check Out"}
          </p>
          <div className="w-14" />
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 max-w-md mx-auto w-full fade-in">
          {/* Photo preview */}
          {capturedPhoto && (
            <div className="relative overflow-hidden rounded-2xl shadow-md border"
              style={{ borderColor: "var(--color-border)" }}>
              <img src={capturedPhoto} alt="Your selfie" className="w-full object-cover" style={{ maxHeight: 220 }} />
              <button
                type="button"
                onClick={openCamera}
                className="absolute bottom-3 right-3 rounded-xl bg-black/60 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-black/80 transition"
              >
                Retake
              </button>
            </div>
          )}

          {/* Mood Selector Section */}
          <div className="rounded-2xl p-4 transition-colors duration-300 border"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <label className="block text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-secondary)" }}>
              How are you feeling right now?
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { value: "stressed", emoji: "😫", label: "Stressed" },
                { value: "down", emoji: "🙁", label: "Low" },
                { value: "neutral", emoji: "😐", label: "Neutral" },
                { value: "good", emoji: "🙂", label: "Good" },
                { value: "great", emoji: "😄", label: "Great" },
              ].map((opt) => {
                const isSelected = mood === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMood(opt.value)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 transition-all duration-200 active:scale-90 ${
                      isSelected
                        ? "shadow-md scale-105"
                        : "hover:scale-102 opacity-80"
                    }`}
                    style={{
                      background: isSelected ? "rgba(16, 185, 129, 0.15)" : "var(--color-surface-raised)",
                      border: isSelected ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                    }}
                  >
                    <span className="text-2xl mb-1">{opt.emoji}</span>
                    <span className="text-[10px] font-bold"
                      style={{ color: isSelected ? "var(--color-accent)" : "var(--color-text-secondary)" }}>
                      {opt.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mood note */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}>
              Mood Note <span className="font-normal opacity-60">(optional)</span>
            </label>
            <input
              type="text"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value.slice(0, 100))}
              placeholder="e.g. Energized and ready for client meetings..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            />
          </div>

          {/* Work note input */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}>
              Attendance Note <span className="font-normal opacity-60">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 280))}
              placeholder="e.g. Working from head office floor 2…"
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition resize-none"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            />
            <p className="mt-1 text-right text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
              {note.length}/280
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-500">
              <p className="whitespace-pre-line">{error}</p>
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="border-t p-4 max-w-md mx-auto w-full backdrop-blur-md"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <button
            onClick={submit}
            disabled={step === "submitting"}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:scale-[1.01] active:scale-95 disabled:opacity-50"
          >
            {step === "submitting" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying & Submitting…
              </span>
            ) : (
              action === "checkin" ? "Complete Check In" : "Complete Check Out"
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────
  const timeStr = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const dateStr = currentTime.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short", year: "numeric" })
  const isCheckedIn = !!today?.is_checked_in

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-md space-y-5 pb-6">
        
        {/* 1. Live Hero Clock & Greeting Card */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 transition-all duration-300 shadow-lg slide-in"
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%), var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Subtle animated floating glow orb */}
          <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl animate-float pointer-events-none" />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--color-accent)" }}>
                {dateStr}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight" style={{ color: "var(--color-text)" }}>
                Good {currentTime.getHours() < 12 ? "Morning" : currentTime.getHours() < 17 ? "Afternoon" : "Evening"},{" "}
                {user?.name?.split(" ")[0]} 👋
              </h2>
            </div>
            
            {/* Live GPS / Policy tag */}
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{
                background: isWfhToday ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
                color: isWfhToday ? "#3b82f6" : "#10b981",
                border: isWfhToday ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <span
                className="h-2 w-2 rounded-full animate-live-dot"
                style={{ background: isWfhToday ? "#3b82f6" : "#10b981" }}
              />
              {isWfhToday ? "WFH Active" : "Office GPS"}
            </span>
          </div>

          {/* Large Digital Clock display */}
          <div className="mt-5 flex items-baseline justify-between border-t pt-4"
            style={{ borderColor: "var(--color-border)" }}>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                Standard Time
              </span>
              <div className="text-3xl font-black font-mono tracking-tight mt-0.5" style={{ color: "var(--color-text)" }}>
                {timeStr}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                Target Shift
              </span>
              <p className="text-sm font-extrabold mt-0.5" style={{ color: "var(--color-text)" }}>
                {displayTargetShiftHours} Hours
              </p>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-500 fade-in">
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p>{successMsg}</p>
          </div>
        )}

        {/* 2. Interactive HERO Punch Card */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 transition-all duration-300 shadow-xl border"
          style={{
            background: isCheckedIn
              ? "linear-gradient(135deg, #064e3b 0%, #022c22 100%)"
              : "var(--color-surface)",
            borderColor: isCheckedIn ? "#047857" : "var(--color-border)",
            color: isCheckedIn ? "#ffffff" : "var(--color-text)",
          }}
        >
          {isCheckedIn ? (
            /* ACTIVE SHIFT VIEW */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    Shift in Progress
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-200/90 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Started at {formatTime(today?.checkin_time)}
                </span>
              </div>

              {/* Huge Live Timer counter */}
              <div className="text-center py-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300/80 mb-1">
                  Active Work Duration
                </p>
                <div className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                  {String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0")}h{" "}
                  {String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0")}m{" "}
                  <span className="text-emerald-400 text-3xl font-extrabold">
                    {String(elapsedSeconds % 60).padStart(2, "0")}s
                  </span>
                </div>
              </div>

              {/* Target Shift Progress bar */}
              <div className="space-y-2 border-t border-emerald-800/70 pt-4">
                <div className="flex justify-between text-xs font-semibold text-emerald-200">
                  <span>Shift Goal: {displayTargetShiftHours} hrs</span>
                  <span>
                    {remainingSeconds > 0
                      ? `${Math.floor(remainingSeconds / 3600)}h ${Math.floor((remainingSeconds % 3600) / 60)}m remaining`
                      : "🎉 Target Completed!"}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-950/80 border border-emerald-800/40 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_12px_#34d399] transition-all duration-1000 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-emerald-300/70 font-bold">
                  <span>{progressPercent}% Complete</span>
                  <span>Target: {displayTargetShiftHours}h</span>
                </div>
              </div>

              {/* Check out button */}
              <button
                onClick={() => startFlow("checkout")}
                className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 py-4 text-base font-extrabold text-white shadow-lg shadow-rose-600/30 transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                CHECK OUT NOW
              </button>
            </div>
          ) : (
            /* READY TO PUNCH VIEW */
            <div className="space-y-5 text-center">
              <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-radar" />
                <span className="text-3xl">🎯</span>
              </div>

              <div>
                <h3 className="text-lg font-black" style={{ color: "var(--color-text)" }}>
                  Ready to Start Your Day?
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  {today?.checkin_time
                    ? `Already checked in once today • Total worked: ${formatHours(today.total_hours)}`
                    : "Tap below to scan your face and mark your morning attendance."}
                </p>
              </div>

              {/* Big animated Check-In Button */}
              <button
                onClick={() => startFlow("checkin")}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 py-4 text-base font-black text-white shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2.5 animate-gradient"
              >
                <svg className="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {today ? "CHECK IN AGAIN" : "FACE CHECK IN"}
              </button>
            </div>
          )}
        </div>

        {/* 3. Today Shift Stats Grid (2x2) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Check In */}
          <div
            className="rounded-2xl p-4 transition-colors duration-300 border shadow-sm"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500 text-xs">
                📥
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                In Time
              </span>
            </div>
            <p className="text-lg font-black" style={{ color: "var(--color-text)" }}>
              {formatTime(today?.checkin_time)}
            </p>
          </div>

          {/* Card 2: Check Out */}
          <div
            className="rounded-2xl p-4 transition-colors duration-300 border shadow-sm"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-500 text-xs">
                📤
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                Out Time
              </span>
            </div>
            <p className="text-lg font-black" style={{ color: "var(--color-text)" }}>
              {formatTime(today?.checkout_time)}
            </p>
          </div>

          {/* Card 3: Total Hours */}
          <div
            className="rounded-2xl p-4 transition-colors duration-300 border shadow-sm"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/10 text-sky-500 text-xs">
                ⏱️
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                Total Hours
              </span>
            </div>
            <p className="text-lg font-black" style={{ color: "var(--color-text)" }}>
              {today?.total_hours ? formatHours(today.total_hours) : "--"}
            </p>
          </div>

          {/* Card 4: Day Status */}
          <div
            className="rounded-2xl p-4 transition-colors duration-300 border shadow-sm"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-500/10 text-purple-500 text-xs">
                🏷️
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                Day Status
              </span>
            </div>
            <div className="mt-1">
              <StatusBadge status={today?.day_status || today?.checkin_status || "pending"} />
            </div>
          </div>
        </div>

        {/* 4. Mispunch Regularization Card */}
        <div
          className="rounded-2xl p-4 transition-colors duration-300 border shadow-sm flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%), var(--color-surface)",
            borderColor: "rgba(245, 158, 11, 0.3)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white font-bold text-lg shadow-md shadow-amber-500/20">
              ⏰
            </div>
            <div>
              <h4 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Missed a Punch?</h4>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Submit regularization for approval
              </p>
              {pendingMispunchCount > 0 && (
                <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingMispunchCount} Pending
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowMispunchModal(true)}
            className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 transition active:scale-95"
          >
            + Request
          </button>
        </div>

        {/* Monthly Attendance Issue Note (Days 1–5 window) */}
        <MonthlyIssueNoteCard />

        {/* PWA Mobile App Install Card */}
        {deferredPrompt && !isAppInstalled && (
          <div
            className="rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden border transition-colors duration-300"
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(20, 184, 166, 0.05) 100%), var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  Install GLR Mobile App
                </h4>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  Add to home screen for instant one-tap biometric face check-in.
                </p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-white transition hover:bg-emerald-600 shadow-md shadow-emerald-500/20 hover:scale-[1.01] active:scale-95"
            >
              INSTALL APP
            </button>
          </div>
        )}

        {/* 5. Attendance Calendar Section */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-text)" }}>
              Monthly Calendar
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors duration-300"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <button
                type="button"
                onClick={prevCalendarMonth}
                className="rounded p-1 hover:opacity-70"
              >
                ‹
              </button>
              <span>{monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
              <button
                type="button"
                onClick={nextCalendarMonth}
                className="rounded p-1 hover:opacity-70"
              >
                ›
              </button>
            </div>
          </div>

          <AttendanceCalendar
            records={calendarRecords}
            holidays={calendarHolidays}
            currentDate={calendarDate}
            saturdayPolicy={user?.saturday_policy || "alt_sat_holiday"}
          />
        </div>

        {/* Modal for Requesting Mispunch */}
        {showMispunchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border space-y-4 transition-colors duration-300"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between border-b pb-3"
                style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                    Request Mispunch Regularization
                  </h3>
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    Select date and enter missing punch details.
                  </p>
                </div>
                <button
                  onClick={() => setShowMispunchModal(false)}
                  className="rounded-full p-2 hover:opacity-70"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleMispunchSubmit} className="space-y-4">
                <div className="space-y-2 p-3.5 rounded-2xl border"
                  style={{ background: "var(--color-surface-raised)", borderColor: "var(--color-border)" }}>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider"
                      style={{ color: "var(--color-text)" }}>
                      1. Select Attendance Date
                    </label>
                    <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border"
                      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
                      <button
                        type="button"
                        onClick={prevCalendarMonth}
                        className="rounded p-1 hover:opacity-70"
                      >
                        ‹
                      </button>
                      <span>{monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
                      <button
                        type="button"
                        onClick={nextCalendarMonth}
                        className="rounded p-1 hover:opacity-70"
                      >
                        ›
                      </button>
                    </div>
                  </div>

                  <AttendanceCalendar
                    records={calendarRecords}
                    holidays={calendarHolidays}
                    currentDate={calendarDate}
                    selectedDate={mispunchDate}
                    onSelectDate={(dateStr) => setMispunchDate(dateStr)}
                    saturdayPolicy={user?.saturday_policy || "alt_sat_holiday"}
                  />

                  {/* Selected Date summary */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-amber-500">Selected Date: </span>
                      <span className="font-bold" style={{ color: "var(--color-text)" }}>
                        {new Date(`${mispunchDate}T00:00:00`).toLocaleDateString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </span>
                    </div>
                    {(() => {
                      const log = calendarRecords.find(r => r.date === mispunchDate)
                      const hol = calendarHolidays.find(h => h.date === mispunchDate)
                      const status = log?.day_status || (hol ? "holiday" : "absent")
                      return <StatusBadge status={status} />
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--color-text-secondary)" }}>
                    2. Mis-punch Type
                  </label>
                  <select
                    value={mispunchType}
                    onChange={(e) => setMispunchType(e.target.value)}
                    className="w-full rounded-xl p-3 text-sm outline-none transition"
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    <option value="checkout_only">Forgot Check-out Only</option>
                    <option value="checkin_only">Forgot Check-in Only</option>
                    <option value="both">Forgot Both Check-in & Check-out</option>
                  </select>
                </div>

                {["checkin_only", "both"].includes(mispunchType) && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}>
                      3. Requested Check-in Time
                    </label>
                    <input
                      type="time"
                      value={mispunchCheckin}
                      onChange={(e) => setMispunchCheckin(e.target.value)}
                      className="w-full rounded-xl p-3 text-sm outline-none transition"
                      style={{
                        background: "var(--color-surface-raised)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                      }}
                      required
                    />
                  </div>
                )}

                {["checkout_only", "both"].includes(mispunchType) && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}>
                      3. Requested Check-out Time
                    </label>
                    <input
                      type="time"
                      value={mispunchCheckout}
                      onChange={(e) => setMispunchCheckout(e.target.value)}
                      className="w-full rounded-xl p-3 text-sm outline-none transition"
                      style={{
                        background: "var(--color-surface-raised)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                      }}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--color-text-secondary)" }}>
                    4. Reason for Mispunch
                  </label>
                  <textarea
                    rows={3}
                    value={mispunchReason}
                    onChange={(e) => setMispunchReason(e.target.value)}
                    placeholder="e.g. Device died / Left early for offsite meeting..."
                    className="w-full rounded-xl p-3 text-sm outline-none transition resize-none"
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t"
                  style={{ borderColor: "var(--color-border)" }}>
                  <button
                    type="button"
                    onClick={() => setShowMispunchModal(false)}
                    className="rounded-xl px-5 py-2.5 text-xs font-bold border transition hover:opacity-80"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mispunchSubmitting}
                    className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 transition disabled:opacity-50"
                  >
                    {mispunchSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </EmployeeLayout>
  )
}
