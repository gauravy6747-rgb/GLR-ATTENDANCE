import api from "../api/axios"

export const getEmployees = async () => {
  const response = await api.get("/employees/")
  return response.data
}

export const createEmployee = async (payload) => {
  const response = await api.post("/employees/", payload)
  return response.data
}

export const deleteEmployee = async (id) => {
  const response = await api.delete(`/employees/${id}`)
  return response.data
}

export const updateEmployee = async (id, payload) => {
  const response = await api.put(`/employees/${id}`, payload)
  return response.data
}
