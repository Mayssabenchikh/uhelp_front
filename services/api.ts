// services/api.ts
import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

/**
 * Standard API response wrapper coming from backend:
 * { success?: boolean, data?: T, message?: string, errors?: any }
 */
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

/** base urls (env provided) */
const API_ROOT = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const API_BASE = `${API_ROOT}/api`;

/** create axios instance */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: 'application/json',
  },
  withCredentials: false,
});

/**
 * Request interceptor: attach token automatically when available.
 * Use InternalAxiosRequestConfig so TS knows headers is presentable.
 */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    if (typeof window === 'undefined') return config;
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    // ensure headers object exists and has the correct shape
    if (!config.headers) {
      config.headers = {} as InternalAxiosRequestConfig['headers'];
    }

    if (token) {
      // Some Axios versions use AxiosHeaders object, assignment works fine
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore errors in interceptor
    // console.warn('request interceptor error', e);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * Response interceptor: centralize 401 handling.
 */
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: any) => {
    const status = error?.response?.status;
    if (status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        // optional: redirect to login
        // window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/** helper to set auth token programmatically (used after login) */
export function setAuthToken(token?: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

/**
 * Small helper to unwrap AxiosResponse and return ApiResponse<T>.
 * Accepts a Promise<AxiosResponse<ApiResponse<T>>> and returns ApiResponse<T>
 */
async function unwrap<T>(p: Promise<AxiosResponse<ApiResponse<T>>>): Promise<ApiResponse<T>> {
  const res = await p;
  return res.data ?? { data: undefined };
}

/* -------------------------
   Service methods (typed)
   ------------------------- */

export const ticketService = {
  getAll: (params?: any) => unwrap<any[]>(api.get<ApiResponse<any[]>>('/tickets', { params })),
  getAssigned: (params?: any) => unwrap<any[]>(api.get<ApiResponse<any[]>>('/tickets/agent/assigned', { params })),
  getAvailable: (params?: any) => unwrap<any[]>(api.get<ApiResponse<any[]>>('/tickets/available', { params })),
  getUserTickets: (params?: any) => unwrap<any[]>(api.get<ApiResponse<any[]>>('/tickets', { params })),
  getById: (id: string | number) => unwrap<any>(api.get<ApiResponse<any>>(`/tickets/${id}`)),
  getResponses: (id: string | number) => unwrap<any[]>(api.get<ApiResponse<any[]>>(`/tickets/${id}/responses`)),
  create: (data: { subject: string; description: string; priority?: string; category?: string; status?: string; agentassigne_id?: number }) => {
    const payload: Record<string, any> = {
      titre: data.subject,
      description: data.description,
      priorite: data.priority ?? null,
      category: data.category ?? null,
      statut: data.status ?? 'open',
    };
    if (data.agentassigne_id) payload.agentassigne_id = data.agentassigne_id;
    return unwrap<any>(api.post<ApiResponse<any>>('/tickets', payload));
  },
  update: (id: string | number, data: any) => unwrap<any>(api.put<ApiResponse<any>>(`/tickets/${id}`, data)),
  delete: (id: string | number) => unwrap<any>(api.delete<ApiResponse<any>>(`/tickets/${id}`)),
  assignAgent: (ticketId: string | number, agentId: number) =>
    unwrap<any>(api.post<ApiResponse<any>>(`/tickets/${ticketId}/assign`, { agent_id: agentId })),
  addResponse: (ticketId: string | number, data: { message: string }) => {
    return unwrap<any>(api.post<ApiResponse<any>>(`/tickets/${ticketId}/responses`, { message: data.message }));
  },
};

export const dashboardService = {
  get: () => unwrap<any>(api.get<ApiResponse<any>>('/dashboard')),
};

export const userService = {
  getProfile: () => unwrap<any>(api.get<ApiResponse<any>>('/me')),
  getTicketCounts: (ids: Array<number | string>) => unwrap<any>(api.get<ApiResponse<any>>('/users/ticket-counts', { params: { ids: ids.join(',') } })),
  updateProfile: (data: any) => {
    if (data instanceof FormData) {
      return unwrap<any>(api.put<ApiResponse<any>>(`/users/${data.get('id')}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }));
    }
    return unwrap<any>(api.put<ApiResponse<any>>(`/users/${data.id}`, data, {
      headers: { 'Content-Type': 'application/json' }
    }));
  },
  updatePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    unwrap<any>(api.put<ApiResponse<any>>('/user/password', data)),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return unwrap<any>(api.post<ApiResponse<any>>('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }));
  },
};

export const billingService = {
  getInvoices: (params?: any) => unwrap<any>(api.get<ApiResponse<any[]>>('/payments', { params })),
  getPayments: (params?: any) => unwrap<any>(api.get<ApiResponse<any[]>>('/payments', { params })),
  getInvoice: (id: number) => unwrap<any>(api.get<ApiResponse<any>>(`/payments/${id}`)),
  getPayment: (id: number) => unwrap<any>(api.get<ApiResponse<any>>(`/payments/${id}`)),
  createPayment: (data: any) => unwrap<any>(api.post<ApiResponse<any>>('/payments', data)),
  downloadInvoice: (id: number) => api.get(`/payments/${id}/invoice/download`, { responseType: 'blob' }),
  getPaymentMethods: () => unwrap<any>(api.get<ApiResponse<any>>('/payment-methods')).catch(() => ({ data: [] })),
  addPaymentMethod: (data: any) => unwrap<any>(api.post<ApiResponse<any>>('/payment-methods', data)).catch(() => ({ data: null })),
  deletePaymentMethod: (id: number) => unwrap<any>(api.delete<ApiResponse<any>>(`/payment-methods/${id}`)).catch(() => ({ data: null })),
};

export const subscriptionService = {
  getCurrent: () => unwrap<any>(api.get<ApiResponse<any>>('/subscriptions')),
  getPlans: () => unwrap<any>(api.get<ApiResponse<any>>('/subscription-plans')),
  subscribe: (planId: number, data?: any) => unwrap<any>(api.post<ApiResponse<any>>('/subscriptions', { subscription_plan_id: planId, ...data })),
  subscribeByPlan: (planId: number) => unwrap<any>(api.post<ApiResponse<any>>(`/subscriptions/${planId}/subscribe`)),
  cancel: (subscriptionId?: number) => {
    if (subscriptionId) return unwrap<any>(api.delete<ApiResponse<any>>(`/subscriptions/${subscriptionId}`));
    return unwrap<any>(api.post<ApiResponse<any>>('/user/subscription/cancel'));
  },
  upgrade: (planId: number) => unwrap<any>(api.post<ApiResponse<any>>(`/user/subscription/upgrade/${planId}`)),
  downgrade: (planId: number) => unwrap<any>(api.post<ApiResponse<any>>(`/user/subscription/downgrade/${planId}`)),
};

export const faqService = {
  getAll: async (_params?: { category?: string; search?: string }) => ({ data: [] as any[] }),
  getCategories: async () => ({ data: [] as any[] }),
};

export const departmentService = {
  getAll: (params?: any) => unwrap<any>(api.get<ApiResponse<any[]>>('/departments', { params })),
};

/** default export to be compatible with existing imports */
export default api;
