// services/api.ts
import axios from 'axios';

const API_ROOT = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const API_BASE = `${API_ROOT}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false, // IMPORTANT: no cookies
});

// helper pour définir le token (après login)
export function setAuthToken(token?: string | null) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

export const ticketService = {
  getAll: (params?: any) => api.get('/tickets', { params }), // -> ${API_ROOT}/api/tickets
  delete: (id: string) => api.delete(`/tickets/${id}`),
  assignAgent: (ticketId: string | number, agentId: number) =>
    api.post(`/tickets/${ticketId}/assign`, { agent_id: agentId }),
};

export const userService = {
  getAgents: () => api.get('/agents'),
};

export default api;
