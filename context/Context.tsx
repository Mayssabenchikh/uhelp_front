'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface AppProviderType {
  isLoading: boolean;
  token: string | null;
  user: any;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppProviderType | undefined>(undefined);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

axios.defaults.baseURL = '/';
axios.defaults.withCredentials = true;

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Fonction pour récupérer le cookie CSRF
  const getCsrfToken = async () => {
    try {
      await axios.get('/sanctum/csrf-cookie');
    } catch (_error) {
      // suppression console.error
      // on pourrait ajouter un toast visuel si besoin
    }
  };

  // Restaurer le token et l'utilisateur au montage
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) {
      setToken(savedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;

      axios.get('/api/users')
        .then(res => setUser(res.data))
        .catch(err => {
          if (err.response?.status === 401) {
            logout();
            toast.error('Session expired. Please login again.');
          }
          // suppression console.error
        });
    }
  }, []);

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await getCsrfToken(); // CSRF avant register

      const res = await axios.post(
        '/api/register',
        { name, email, password, password_confirmation: password },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success(res.data.message);

      if (res.data.access_token) {
        const newToken = res.data.access_token;
        localStorage.setItem('access_token', newToken);
        setToken(newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setUser(res.data.user);
      }
    } catch (err: any) {
      // suppression console.error

      if (err.response) {
        const errorData = err.response.data;
        if (errorData.errors) {
          Object.values(errorData.errors)
            .flat()
            .forEach((message: any) => toast.error(message));
        } else if (errorData.message) {
          toast.error(errorData.message);
        } else {
          toast.error('Registration failed. Please try again.');
        }
      } else {
        toast.error('Network error. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      await getCsrfToken();

      const res = await axios.post(
        '/api/login',
        { email, password },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      const newToken = res.data?.access_token ?? null;
      if (newToken) {
        localStorage.setItem('access_token', newToken);
        setToken(newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }

      setUser(res.data?.user ?? null);
      setIsLoading(false);

      return { success: true, message: res.data?.message ?? 'Login successful' };
    } catch (err: any) {
      setIsLoading(false);

      const validationErrors = err?.response?.data?.errors ?? null;
      const serverMessage = err?.response?.data?.message ?? null;

      if (validationErrors) {
        const first = Object.values(validationErrors).flat()[0] ?? 'Validation error';
        // suppression console.error
        toast.error(String(first));
        return { success: false, message: String(first) };
      }

      if (serverMessage) {
        // suppression console.error
        toast.error(String(serverMessage));
        return { success: false, message: String(serverMessage) };
      }

      // Erreur réseau / inconnue
      const fallback = err?.request ? 'Cannot connect to server.' : 'Network error. Please try again.';
      // suppression console.error
      toast.error(fallback);
      return { success: false, message: fallback };
    }
  };

  const logout = () => {
    axios.post('/api/logout', {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {}); // suppression console.error

    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  return (
    <AppContext.Provider value={{ isLoading, token, user, login, register, logout }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
