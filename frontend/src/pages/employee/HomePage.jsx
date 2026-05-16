import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import EmployeeLayout from "../../layouts/EmployeeLayout"
import { getTodayAttendance, checkin, checkout } from "../../services/attendanceService"
import { getApiErrorMessage } from "../../api/axios"

function getGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by your browser."))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        const permissionDenied = err.code === err.PERMISSION_DENIED
        const timedOut = err.code === err.TIMEOUT
        const message = permissionDenied
          ? "Location permission is blocked. Please allow location access for this site and try again."
          : timedOut
            ? "Location request timed out. Please turn on GPS and try again."
            : "Unable to get your location. Please check your GPS and try again."
        reject(new Error(message))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
}

function formatTime(value) {
  if (!value) return "--:--"
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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

  const [today, setToday] = useState(null)     // today's attendance record
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState(null)   // 'checkin' | 'checkout'
  const [step, setStep] = useState("idle")     // idle | camera | note | gps | submitting
  const [countdown, setCountdown] = useState(null)
  const [note, setNote] = useState("")
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [stream, setStream] = useState(null)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

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

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }

  const openCamera = async () => {
    setError("")
    setCapturedPhoto(null)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      })
      setStream(mediaStream)
      setStep("camera")
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream
      }, 100)
    } catch {
      setError("Camera access is required for face verification. Please allow camera access and try again.")
      setStep("note")
    }
  }

  const startFlow = async (actionType) => {
    setAction(actionType)
    setNote("")
    await openCamera()
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
      const coords = await getGPS()
      if (action === "checkin") {
        await checkin(coords.latitude, coords.longitude, note || null, capturedPhoto)
      } else {
        await checkout(coords.latitude, coords.longitude, note || null, capturedPhoto)
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
              <p className="text-sm text-red-700">{error}</p>
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
                  {today?.total_hours ? `${Number(today.total_hours).toFixed(2)} hrs` : "--"}
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

        {/* Action buttons */}
        {!loading && (
          <div className="space-y-3">
            {!checkedIn && (
              <button
                onClick={() => startFlow("checkin")}
                className="w-full rounded-2xl bg-emerald-600 py-5 text-lg font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95"
              >
                CHECK IN
              </button>
            )}

            {checkedIn && !checkedOut && (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600" />
                  </span>
                  <p className="text-sm font-semibold text-emerald-700">
                    Checked in at {formatTime(today.checkin_time)}
                  </p>
                </div>
                <button
                  onClick={() => startFlow("checkout")}
                  className="w-full rounded-2xl border-2 border-gray-900 bg-white py-5 text-lg font-bold text-gray-900 shadow-sm transition hover:bg-gray-50 active:scale-95"
                >
                  CHECK OUT
                </button>
              </>
            )}

            {checkedIn && checkedOut && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                <p className="text-sm font-semibold text-gray-500">All done for today!</p>
                <p className="mt-1 text-2xl font-bold text-gray-950">
                  {Number(today.total_hours).toFixed(2)} hrs worked
                </p>
                <div className="mt-3">
                  <StatusBadge status={today.day_status} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </EmployeeLayout>
  )
}
