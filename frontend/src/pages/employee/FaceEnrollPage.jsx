import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import api, { getApiErrorMessage } from "../../api/axios"

function FaceEnrollPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const [step, setStep] = useState("intro") // intro | camera | preview | submitting | done
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [error, setError] = useState("")
  const [stream, setStream] = useState(null)

  const startCamera = async () => {
    setError("")
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      })
      setStream(mediaStream)
      setStep("camera")
      // Give the video element time to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
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
        setError("Camera access is blocked or unavailable. Please enable camera permissions for this website in your browser settings and try again.")
      }
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
    setCapturedPhoto(dataUrl)
    // Stop camera stream
    stream?.getTracks().forEach((t) => t.stop())
    setStep("preview")
  }

  const retake = () => {
    setCapturedPhoto(null)
    startCamera()
  }

  const confirmEnroll = async () => {
    setStep("submitting")
    setError("")
    try {
      await api.post("/face/enroll", { photo: capturedPhoto })
      setStep("done")
      // Update local auth state
      if (user) setUser({ ...user, face_enrolled: true })
    } catch (err) {
      setError(getApiErrorMessage(err, "Enrollment failed. Please try again."))
      setStep("preview")
    }
  }

  if (step === "done") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f6f7f9] px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-emerald-100">
            <svg className="h-10 w-10 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-950">Face Enrolled!</h1>
          <p className="mt-2 text-sm text-gray-500">You can now check in and out using face verification.</p>
          <button
            onClick={() => navigate("/home")}
            className="mt-8 w-full rounded-xl bg-emerald-600 py-4 text-base font-bold text-white transition hover:bg-emerald-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f6f7f9]">
      <div className="flex-1 px-5 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-600 text-lg font-bold text-white">
            GLR
          </div>
          <h1 className="text-2xl font-bold text-gray-950">Face Enrollment</h1>
          <p className="mt-2 text-sm text-gray-500">
            Required before you can check in. Take a clear selfie in good lighting.
          </p>
        </div>

        {/* Intro */}
        {step === "intro" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                {[
                  { icon: "💡", text: "Face your camera directly" },
                  { icon: "☀️", text: "Make sure your face is well lit" },
                  { icon: "😐", text: "Keep a neutral expression" },
                  { icon: "🚫", text: "Remove sunglasses or hats" }
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <p className="text-sm font-medium text-gray-700">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">{error}</p>
            )}

            <button
              onClick={startCamera}
              className="w-full rounded-xl bg-emerald-600 py-4 text-base font-bold text-white transition hover:bg-emerald-700"
            >
              Open Camera
            </button>
          </div>
        )}

        {/* Camera view */}
        {step === "camera" && (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-black shadow-lg" style={{ aspectRatio: "4/3" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {/* Face oval guide */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-52 w-40 rounded-full border-4 border-white/70 shadow-lg" />
              </div>
            </div>

            <button
              onClick={capturePhoto}
              className="w-full rounded-xl bg-emerald-600 py-4 text-base font-bold text-white transition hover:bg-emerald-700"
            >
              Capture Photo
            </button>
          </div>
        )}

        {/* Preview */}
        {step === "preview" && (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl shadow-lg">
              <img src={capturedPhoto} alt="Captured face" className="w-full object-cover" />
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={retake}
                className="flex-1 rounded-xl border border-gray-300 bg-white py-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
              >
                Retake
              </button>
              <button
                onClick={confirmEnroll}
                className="flex-1 rounded-xl bg-emerald-600 py-4 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Confirm & Enroll
              </button>
            </div>
          </div>
        )}

        {/* Submitting */}
        {step === "submitting" && (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            <p className="text-sm font-medium text-gray-500">Enrolling your face…</p>
          </div>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}

export default FaceEnrollPage
