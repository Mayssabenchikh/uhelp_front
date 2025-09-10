import axios from 'axios';

const API_ROOT = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const API_BASE = `${API_ROOT}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Accept': 'application/json'
  },
  withCredentials: false,
});

// Add request interceptor to include token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);


// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear tokens on 401
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
      }
      // Optionally redirect to login or dispatch logout action
    }
    return Promise.reject(error);
  }
);

// helper pour définir le token (après login)
export function setAuthToken(token?: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export const ticketService = {
  getAll: (params?: any) => api.get('/tickets', { params }),
  getUserTickets: (params?: any) => api.get('/tickets', { params }),
  getById: (id: string | number) => api.get(`/tickets/${id}`),
  getResponses: (id: string | number) => api.get(`/tickets/${id}/responses`),
  create: (data: { subject: string; description: string; priority?: string; category?: string; status?: string; agentassigne_id?: number }) => {
    const payload: Record<string, any> = {
      titre: data.subject,
      description: data.description,
      priorite: data.priority ?? null,
      category: data.category ?? null,
      statut: data.status ?? 'open',
    };
    if (data.agentassigne_id) payload.agentassigne_id = data.agentassigne_id;
    return api.post('/tickets', payload);
  },
  update: (id: string | number, data: any) => api.put(`/tickets/${id}`, data),
  delete: (id: string | number) => api.delete(`/tickets/${id}`),
  assignAgent: (ticketId: string | number, agentId: number) =>
    api.post(`/tickets/${ticketId}/assign`, { agent_id: agentId }),
  addResponse: (ticketId: string | number, data: { message: string; attachments?: File[] }) =>
    api.post(`/tickets/${ticketId}/responses`, data),
};

export const dashboardService = {
  get: () => api.get('/dashboard'),
};

export const userService = {
  getProfile: () => api.get('/me'),
  getTicketCounts: (ids: Array<number | string>) => api.get('/users/ticket-counts', { params: { ids: ids.join(',') } }),
updateProfile: (data: any) => {
  if (data instanceof FormData) {
    return api.put(`/users/${data.get('id')}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
  return api.put(`/users/${data.id}`, data, {
    headers: { 'Content-Type': 'application/json' }
  });
},
  updatePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    api.put('/user/password', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// FIXED: Align billing service with Payment model backend
export const billingService = {
  // Get payments (invoices) - matches PaymentController@index
  getInvoices: (params?: any) => api.get('/payments', { params }),
  getPayments: (params?: any) => api.get('/payments', { params }),
  
  // Get single payment - matches PaymentController@show  
  getInvoice: (id: number) => api.get(`/payments/${id}`),
  getPayment: (id: number) => api.get(`/payments/${id}`),
  
  // Create new payment - matches PaymentController@store
  createPayment: (data: {
    subscription_plan_id?: number;
    amount?: number;
    currency?: string;
    description?: string;
  }) => api.post('/payments', data),
  
  // Download invoice - matches PaymentController@downloadInvoice
  downloadInvoice: (id: number) => api.get(`/payments/${id}/invoice/download`, { responseType: 'blob' }),
  
  // Payment methods endpoints (if implemented)
  getPaymentMethods: () => api.get('/payment-methods').catch(() => ({ data: [] })),
  addPaymentMethod: (data: any) => api.post('/payment-methods', data).catch(() => ({ data: null })),
  deletePaymentMethod: (id: number) => api.delete(`/payment-methods/${id}`).catch(() => ({ data: null })),
};

export const subscriptionService = {
  // retourne les subscriptions (ou la souscription courante selon backend)
  getCurrent: () => api.get('/subscriptions').then(r => r.data),

  // plans
  getPlans: () => api.get('/subscription-plans').then(r => r.data),

  // créer une souscription via le controller store (ou utiliser /subscriptions/{plan}/subscribe)
  subscribe: (planId: number, data?: any) =>
    api.post('/subscriptions', { subscription_plan_id: planId, ...data }).then(r => r.data),

  // alternative si tu préfères appeler /subscriptions/{plan}/subscribe (il marche aussi)
  subscribeByPlan: (planId: number) =>
    api.post(`/subscriptions/${planId}/subscribe`).then(r => r.data),

  // annuler : utilise l'endpoint user/subscription/cancel ou DELETE /subscriptions/{id}
  cancel: (subscriptionId?: number) => {
    if (subscriptionId) {
      return api.delete(`/subscriptions/${subscriptionId}`).then(r => r.data);
    }
    // fallback: call cancel current
    return api.post('/user/subscription/cancel').then(r => r.data);
  },

  upgrade: (planId: number) => api.post(`/user/subscription/upgrade/${planId}`).then(r => r.data),
  downgrade: (planId: number) => api.post(`/user/subscription/downgrade/${planId}`).then(r => r.data),
};

export const faqService = {
  getAll: async (_params?: { category?: string; search?: string }) => ({ data: [] as any[] }),
  getCategories: async () => ({ data: [] as any[] }),
};

export const departmentService = {
  getAll: (params?: any) => api.get('/departments', { params }),
};

export default api;