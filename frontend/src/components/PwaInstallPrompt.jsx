import { useEffect, useState } from "react"

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone
}

function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("pwa_install_dismissed") === "true")

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setDismissed(true)
      localStorage.setItem("pwa_install_dismissed", "true")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  if (!installPrompt || dismissed || isStandalone()) return null

  const installApp = async () => {
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem("pwa_install_dismissed", "true")
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[70] rounded-lg border border-emerald-200 bg-white p-4 shadow-lg sm:left-auto sm:w-80">
      <p className="text-sm font-bold text-gray-950">Install GLR Attendance</p>
      <p className="mt-1 text-xs text-gray-500">Open it faster from your home screen.</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={installApp}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Install
        </button>
        <button
          onClick={dismiss}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          Later
        </button>
      </div>
    </div>
  )
}

export default PwaInstallPrompt
