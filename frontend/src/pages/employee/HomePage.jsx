import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import EmployeeLayout from "../../layouts/EmployeeLayout"
import { getTodayAttendance, getMyHistory, checkin, checkout } from "../../services/attendanceService"
import { submitMispunchRequest, getMyMispunchRequests } from "../../services/mispunchService"
import AttendanceCalendar from "../../components/AttendanceCalendar"
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
        // If high accuracy times out (common indoors or on iPhones), try with low accuracy fallback
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
        "1. Go to iPhone Settings > Privacy & Security > Location Services (make sure it's turned ON).\n" +
        "2. Scroll down on that screen, select Safari (or your browser) and change settings to 'Allow' or 'Ask'.\n" +
        "3. If you installed this as a Home Screen App (PWA), go to Settings > PWA App Name > Location > Allow."
      )
    }
    return new Error("Location permission is blocked. Please enable location permissions for this website in your browser settings and try again.")
  } else if (err.code === err.TIMEOUT) {
    return new Error("Location request timed out. Please turn ON your device's location/GPS services, move near a window/open area, and try again.")
  } else {
    return new Error("Unable to retrieve your location. Please check if your device's GPS is enabled and try again.")
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
  return `${finalHrs} hrs ${finalMins} mins`
}

function StatusBadge({ status }) {
  const map = {
    full_day: { label: "Full Day", cls: "bg-emerald-100 text-emerald-700" },
    half_day: { label: "Half Day", cls: "bg-amber-100 text-amber-700" },
    present: { label: "Present", cls: "bg-blue-100 text-blue-700" },
    on_time: { label: "On Time", cls: "bg-emerald-100 text-emerald-700" },
    late: { label: "Late", cls: "bg-amber-100 text-amber-700" },
    early_bird: { label: "Early Bird", cls: "bg-blue-100 text-blue-700" },
    early_leave: { label: "Early Leave", cls: "bg-amber-100 text-amber-700" },
    on_time_out: { label: "On Time Out", cls: "bg-emerald-100 text-emerald-700" },
  }
  const s = map[status] || { label: status, cls: "bg-gray-100 text-gray-700" }
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Calculate WFH Saturday status
  const todayDate = new Date()
  const isSaturday = todayDate.getDay() === 6 // Saturday is 6 (0 is Sunday, 6 is Saturday)
  const dayOfMonth = todayDate.getDate()
  const saturdayIndex = Math.floor((dayOfMonth - 1) / 7) + 1

  const isWfhToday = isSaturday && (
    user?.saturday_policy === "all_sat_wfh" ||
    (user?.saturday_policy === "alt_sat_holiday_rest_wfh" && saturdayIndex !== 2 && saturdayIndex !== 4)
  )

  const [today, setToday] = useState(null)     // today's attendance record
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState(null)   // 'checkin' | 'checkout'
  const [step, setStep] = useState("idle")     // idle | camera | note | gps | submitting
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

    // Check standalone mode
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
    // Redirect to enrollment if face not enrolled
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

  // Target shift hours calculation (6.5 hrs on Saturday half day policy, 8.5 hrs otherwise)
  const targetShiftHours = (isSaturday && user?.saturday_policy === "all_sat_half_day") ? 6.5 : 8.5
  const targetShiftSeconds = targetShiftHours * 3600
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetShiftSeconds) * 100))
  const remainingSeconds = Math.max(0, targetShiftSeconds - elapsedSeconds)

  // Calendar state for Home page
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarRecords, setCalendarRecords] = useState([])
  const [calendarHolidays, setCalendarHolidays] = useState([])
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null)

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

  // Mispunch state on Home page
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
          "2. If you installed this as a Home Screen App (PWA), go to iPhone Settings > PWA App Name > Camera > Allow."
        )
      } else {
        setError("Camera access is required for face verification. Please allow camera permissions for this website in your browser settings and try again.")
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
            // Need a slight delay to allow state to settle before capturing
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
      setSuccessMsg(action === "checkin" ? "Checked in successfully!" : "Checked out successfully!")
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

  const checkedIn = !!today?.checkin_time
  const checkedOut = !!today?.checkout_time

  // ── Camera step ──────────────────────────────────────────────────────────
  if (step === "camera") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black h-[100dvh]">
        <div className="flex items-center justify-between p-4">
          <button onClick={cancel} className="text-white/80 text-sm font-semibold">Cancel</button>
          <p className="text-white text-sm font-semibold">
            {action === "checkin" ? "Face Check-In" : "Face Check-Out"}
          </p>
          <div className="w-14" />
        </div>
        <div className="relative flex-1 overflow-hidden bg-black flex flex-col justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
          
          {/* Face oval guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-64 w-52 rounded-full border-4 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
          </div>

          <p className="absolute bottom-32 w-full text-center text-sm font-medium text-white shadow-black drop-shadow-md z-10">
            Position your face within the oval
          </p>

          {/* Auto-capture Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
              <span className="text-7xl font-bold text-white drop-shadow-lg animate-pulse">{countdown}</span>
              <span className="mt-4 text-lg font-semibold text-white drop-shadow-md">Auto-capturing...</span>
            </div>
          )}

          {/* Manual Capture Button (Fixed at bottom to avoid flex issues) */}
          <div className="absolute bottom-8 left-0 right-0 px-6 z-20">
            <button
              onClick={() => {
                setCountdown(null)
                captureAndProceed()
              }}
              className="w-full rounded-2xl bg-emerald-500/90 backdrop-blur py-4 text-base font-bold text-white shadow-lg"
            >
              Capture Now
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
      <div className="fixed inset-0 z-50 flex flex-col bg-[#f6f7f9] h-[100dvh]">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <button onClick={cancel} className="text-sm font-semibold text-gray-500">Cancel</button>
          <p className="text-sm font-bold text-gray-900">
            {action === "checkin" ? "Check In" : "Check Out"}
          </p>
          <div className="w-14" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
          {/* Photo preview */}
          {capturedPhoto && (
            <div className="overflow-hidden rounded-2xl shadow-sm">
              <img src={capturedPhoto} alt="Your selfie" className="w-full object-cover" style={{ maxHeight: 200 }} />
            </div>
          )}

          {/* Mood Selector Section */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              How are you feeling {action === "checkin" ? "at check-in" : "at check-out"}?
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { value: "stressed", emoji: "😫", label: "Stressed" },
                { value: "down", emoji: "🙁", label: "Down" },
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
                    className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition active:scale-95 duration-150 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/60 font-semibold text-emerald-700 ring-2 ring-emerald-100"
                        : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-2xl mb-1">{opt.emoji}</span>
                    <span className="text-[10px]">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mood description input */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Describe your mood <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value.slice(0, 100))}
              placeholder="e.g. Feeling motivated today..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          {/* Note input */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Add a note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 280))}
              placeholder="e.g. Working from main office…"
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 resize-none"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{note.length}/280</p>
          </div>

          {error && (
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
              <button
                type="button"
                onClick={capturedPhoto ? submit : openCamera}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Try Again
              </button>
              {capturedPhoto && (
                <button
                  type="button"
                  onClick={openCamera}
                  className="ml-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                >
                  Retake Photo
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white p-5">
          <button
            onClick={submit}
            disabled={step === "submitting"}
            className="w-full rounded-xl bg-emerald-600 py-4 text-base font-bold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
          >
            {step === "submitting" ? "Submitting…" : action === "checkin" ? "Confirm Check In" : "Confirm Check Out"}
          </button>
        </div>
      </div>
    )
  }

  // ── Main dashboard ────────────────────────────────────────────────────────
  const todayStr = new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-md space-y-5">
        {/* Date + greeting */}
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400">{todayStr}</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-950">
            Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"},{" "}
            {user?.name?.split(" ")[0]}
          </h2>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-semibold text-emerald-700">{successMsg}</p>
          </div>
        )}

        {/* WFH notification */}
        {isWfhToday && (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 shadow-sm">
            <span className="text-xl">🏡</span>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-blue-900">WFH Mode Active</p>
              <p className="text-xs text-blue-600 font-medium">No face or GPS verification is required for today's check-in.</p>
            </div>
          </div>
        )}

        {/* Mispunch Quick Card */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 to-orange-50/50 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white font-bold text-lg shadow-sm">
              ⏰
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-950">Forgot Punch?</h4>
              <p className="text-xs text-gray-500">Submit a mispunch regularization request</p>
              {pendingMispunchCount > 0 && (
                <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                  {pendingMispunchCount} Request Pending
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowMispunchModal(true)}
            className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
          >
            + Request
          </button>
        </div>



        {/* Today status card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400 mb-4">Today&apos;s Attendance</p>

          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Check In</p>
                <p className="text-sm font-semibold text-gray-900">{formatTime(today?.checkin_time)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Check Out</p>
                <p className="text-sm font-semibold text-gray-900">{formatTime(today?.checkout_time)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Hours</p>
                <p className="text-sm font-semibold text-gray-900">
                  {today?.total_hours ? formatHours(today.total_hours) : "--"}
                </p>
              </div>
              {today?.checkin_status && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Status</p>
                  <StatusBadge status={today.day_status || today.checkin_status} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* PWA Install Card */}
        {deferredPrompt && !isAppInstalled && (
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 p-5 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/10">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-950">Install GLR Mobile App</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Add this app to your Home Screen for quick, one-tap face check-in and live attendance updates.
                </p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm shadow-emerald-600/10 hover:scale-[1.01] active:scale-[0.99]"
            >
              INSTALL APP
            </button>
          </div>
        )}

        {/* Action buttons */}
        {!loading && (
          <div className="space-y-3">
            {(!today || !today.is_checked_in) && (
              <>
                {today && (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <span className="relative flex h-3 w-3">
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-gray-400" />
                    </span>
                    <p className="text-sm font-semibold text-gray-600">
                      Currently checked out • {formatHours(today.total_hours)} worked today
                    </p>
                  </div>
                )}
                <button
                  onClick={() => startFlow("checkin")}
                  className="w-full rounded-2xl bg-emerald-600 py-5 text-lg font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95"
                >
                  {today ? "CHECK IN AGAIN" : "CHECK IN"}
                </button>
              </>
            )}

            {today && today.is_checked_in && (
              <div className="space-y-4">
                {/* Live Shift Timer Card */}
                <div className="rounded-2xl border border-emerald-700/30 bg-gradient-to-br from-emerald-900 to-teal-950 p-5 text-white shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                      </span>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                        Shift in Progress
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-200">
                      In at {formatTime(today.checkin_time)}
                    </span>
                  </div>

                  <div className="text-center py-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300/80">
                      Time Worked Today
                    </p>
                    <div className="mt-1 font-mono text-3xl font-black tracking-tight text-white drop-shadow-md">
                      {String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0")}h{" "}
                      {String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0")}m{" "}
                      {String(elapsedSeconds % 60).padStart(2, "0")}s
                    </div>
                  </div>

                  {/* Shift Target Progress Bar */}
                  <div className="space-y-1.5 border-t border-emerald-800/60 pt-3">
                    <div className="flex justify-between text-xs font-medium text-emerald-200">
                      <span>Target: {targetShiftHours} hrs</span>
                      <span>
                        {remainingSeconds > 0
                          ? `${Math.floor(remainingSeconds / 3600)}h ${Math.floor((remainingSeconds % 3600) / 60)}m left`
                          : "Shift Target Completed! 🎉"}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-950">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-emerald-300/70 text-right font-semibold">
                      {progressPercent}% completed
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => startFlow("checkout")}
                  className="w-full rounded-2xl border-2 border-gray-900 bg-white py-5 text-lg font-bold text-gray-900 shadow-sm transition hover:bg-gray-50 active:scale-95"
                >
                  CHECK OUT
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal for Requesting Mispunch from Home */}
        {showMispunchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-950">
                    Request Mispunch Regularization
                  </h3>
                  <p className="text-xs text-gray-500">
                    Tap a date on the calendar below to select the mispunch date.
                  </p>
                </div>
                <button
                  onClick={() => setShowMispunchModal(false)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleMispunchSubmit} className="space-y-4">
                {/* Visual Calendar Date Picker inside Modal */}
                <div className="space-y-2 border border-gray-200 bg-gray-50/50 p-3.5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                      1. Select Attendance Date
                    </label>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                      <button
                        type="button"
                        onClick={prevCalendarMonth}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        ‹
                      </button>
                      <span>{monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
                      <button
                        type="button"
                        onClick={nextCalendarMonth}
                        className="rounded p-1 hover:bg-gray-100"
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

                  {/* Selected Date Summary Banner */}
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-amber-800 font-medium">Selected Date: </span>
                      <span className="font-bold text-gray-950">
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    2. Mis-punch Type
                  </label>
                  <select
                    value={mispunchType}
                    onChange={(e) => setMispunchType(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  >
                    <option value="checkout_only">Forgot Check-out Only</option>
                    <option value="checkin_only">Forgot Check-in Only</option>
                    <option value="both">Forgot Both Check-in & Check-out</option>
                  </select>
                </div>

                {["checkin_only", "both"].includes(mispunchType) && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      3. Requested Check-in Time
                    </label>
                    <input
                      type="time"
                      value={mispunchCheckin}
                      onChange={(e) => setMispunchCheckin(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      required
                    />
                  </div>
                )}

                {["checkout_only", "both"].includes(mispunchType) && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      3. Requested Check-out Time
                    </label>
                    <input
                      type="time"
                      value={mispunchCheckout}
                      onChange={(e) => setMispunchCheckout(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    4. Reason for Mispunch
                  </label>
                  <textarea
                    rows={3}
                    value={mispunchReason}
                    onChange={(e) => setMispunchReason(e.target.value)}
                    placeholder="e.g. System issue / Forgot to checkout while leaving office..."
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowMispunchModal(false)}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mispunchSubmitting}
                    className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-700 transition disabled:opacity-50"
                  >
                    {mispunchSubmitting ? "Submitting..." : "Submit Mispunch Request"}
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
