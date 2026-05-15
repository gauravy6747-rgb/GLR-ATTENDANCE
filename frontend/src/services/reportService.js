import api from "../api/axios"

export const downloadAttendanceReport = async () => {
  const response = await api.get("/export/attendance/xlsx", {
    responseType: "blob"
  })

  return response.data
}
