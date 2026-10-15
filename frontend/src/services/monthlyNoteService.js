import api from "../api/axios"

export const getMonthlyNoteWindowInfo = async () => {
  const response = await api.get("/monthly-notes/window")
  return response.data
}

export const submitMonthlyNote = async (note, ignoreWindow = false) => {
  const response = await api.post(`/monthly-notes/submit?ignore_window=${ignoreWindow}`, {
    note
  })
  return response.data
}

export const getMyMonthlyNotes = async () => {
  const response = await api.get("/monthly-notes/my-notes")
  return response.data
}

export const getAdminMonthlyNotes = async (year, month) => {
  const params = new URLSearchParams()
  if (year) params.append("year", year)
  if (month) params.append("month", month)
  const response = await api.get(`/monthly-notes/admin/all?${params.toString()}`)
  return response.data
}
