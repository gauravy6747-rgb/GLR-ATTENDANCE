import api from "../api/axios"

export const getAdminStats = async () => {
  const response = await api.get("/dashboard/admin-stats")

  return response.data
}
