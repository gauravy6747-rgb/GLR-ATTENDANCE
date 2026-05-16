import api from "../api/axios"

export const getLocations = async () => {
  const response = await api.get("/locations/")
  return response.data
}

export const createLocation = async (data) => {
  const response = await api.post("/locations/", data)
  return response.data
}

export const deactivateLocation = async (id) => {
  const response = await api.delete(`/locations/${id}`)
  return response.data
}
