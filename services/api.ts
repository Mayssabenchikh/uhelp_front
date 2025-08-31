// services/api.ts
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  // withCredentials: true, // décommente si tu utilises les cookies / Sanctum
})

// helper pour définir le token (après login)
export function setAuthToken(token?: string | null) {
  if (token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else
    delete api.defaults.headers.common['Authorization']
}

export const ticketService = {
  getAll: (params?: any) => api.get('/tickets', { params }), // -> /api/tickets
  delete: (id: string) => api.delete(`/tickets/${id}`),
  assignAgent: (ticketId: string, agentId: number) =>
    api.post(`/tickets/${ticketId}/assign`, { agent_id: agentId }),
}

export const userService = {
  getAgents: () => api.get('/agents'),
}

export default api