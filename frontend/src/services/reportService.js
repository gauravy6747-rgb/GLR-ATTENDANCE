import api from "../api/axios"

export const downloadAttendanceReport = async (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.query_date) params.append("query_date", filters.query_date)
  if (filters.year) params.append("year", filters.year)
  if (filters.month) params.append("month", filters.month)
  if (filters.employee_id) params.append("employee_id", filters.employee_id)

  const response = await api.get(`/export/attendance/xlsx?${params.toString()}`, {
    responseType: "blob"
  })

  return response.data
}
