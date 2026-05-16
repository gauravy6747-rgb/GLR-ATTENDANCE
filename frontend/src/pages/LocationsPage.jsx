import { useEffect, useState } from "react"
import AdminLayout from "../layouts/AdminLayout"
import { createLocation, deactivateLocation, getLocations } from "../services/locationService"
import { getApiErrorMessage } from "../api/axios"

const emptyForm = {
  name: "",
  latitude: "",
  longitude: "",
  radius_meters: 100
}

function LocationsPage() {
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let ignore = false

    getLocations()
      .then((data) => {
        if (ignore) return
        setLocations(data)
        setError("")
      })
      .catch((err) => {
        if (!ignore) setError(getApiErrorMessage(err, "Failed to load office locations"))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  const set = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.")
      return
    }

    setDetecting(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(8),
          longitude: position.coords.longitude.toFixed(8)
        }))
        setDetecting(false)
      },
      () => {
        setError("Unable to get this device location. Enter latitude and longitude manually.")
        setDetecting(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      const created = await createLocation({
        name: form.name.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radius_meters: Number(form.radius_meters)
      })
      setLocations((prev) => [created, ...prev])
      setForm(emptyForm)
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add office location"))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id) => {
    if (!window.confirm("Deactivate this office location? Employees will no longer be able to check in from it.")) return

    try {
      await deactivateLocation(id)
      setLocations((prev) => prev.filter((location) => location.id !== id))
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to deactivate office location"))
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-950">Office Locations</h2>
          <p className="mt-1 text-sm text-gray-500">At least one active location is required before employees can check in.</p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_0.7fr_auto] lg:items-end">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Location Name</label>
              <input
                value={form.name}
                onChange={set("name")}
                placeholder="Main Office"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Latitude</label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={set("latitude")}
                placeholder="28.61390000"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Longitude</label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={set("longitude")}
                placeholder="77.20900000"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Radius</label>
              <input
                type="number"
                min="25"
                max="5000"
                value={form.radius_meters}
                onChange={set("radius_meters")}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={detecting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:text-gray-400"
              >
                {detecting ? "Detecting..." : "Use GPS"}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
              >
                {saving ? "Saving..." : "Add"}
              </button>
            </div>
          </div>
        </form>

        {loading ? (
          <p className="text-sm text-gray-400">Loading locations...</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-gray-950 text-white">
                  <th className="p-4 text-left text-sm font-semibold">Name</th>
                  <th className="p-4 text-left text-sm font-semibold">Latitude</th>
                  <th className="p-4 text-left text-sm font-semibold">Longitude</th>
                  <th className="p-4 text-left text-sm font-semibold">Radius</th>
                  <th className="p-4 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {locations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="p-4 text-sm font-semibold text-gray-900">{location.name}</td>
                    <td className="p-4 text-sm text-gray-600">{Number(location.latitude).toFixed(8)}</td>
                    <td className="p-4 text-sm text-gray-600">{Number(location.longitude).toFixed(8)}</td>
                    <td className="p-4 text-sm text-gray-600">{location.radius_meters} m</td>
                    <td className="p-4 text-right">
                      <a
                        href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mr-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        Map
                      </a>
                      <button
                        onClick={() => handleDeactivate(location.id)}
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {locations.length === 0 && (
              <p className="p-6 text-sm text-gray-400">No active office locations. Add one to enable employee check-in.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default LocationsPage
