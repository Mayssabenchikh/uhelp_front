'use client';

import { createContext, useContext, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface AppProviderType {
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
}

const AppContext = createContext<AppProviderType | undefined>(undefined);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/register`,
        {
          name,
          email,
          password,
          password_confirmation: password,  // 🔴 indispensable
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      toast.success(response.data.message);
      // Ex. stocker le token si tu veux loguer tout de suite :
      // localStorage.setItem('token', response.data.access_token);
    } catch (error: any) {
        console.error('Register Error Response:', error.response?.data);

      if (error.response?.data?.errors) {
        // Affiche chaque message de validation
        Object.values(error.response.data.errors).flat().forEach((msg: any) => toast.error(msg as string));
      } else {
        toast.error(error.response?.data?.message || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/login`,
        { email, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      toast.success(response.data.message);
      // par exemple :
      // localStorage.setItem('token', response.data.access_token);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppContext.Provider value={{ isLoading, login, register }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
