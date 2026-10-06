import api from "../api/axios"

export const submitMispunchRequest = async (data) => {
  const response = await api.post("/mispunch/request", data)
  return response.data
}

export const getMyMispunchRequests = async () => {
  const response = await api.get("/mispunch/my-requests")
  return response.data
}

export const getAllMispunchRequests = async () => {
  const response = await api.get("/mispunch/all")
  return response.data
}

export const actionMispunchRequest = async (requestId, actionData) => {
  const response = await api.post(`/mispunch/${requestId}/action`, actionData)
  return response.data
}
