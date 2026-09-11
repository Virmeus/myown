import { create } from 'zustand';
import api from '../utils/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  needsRegistration: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authenticated: false,
  loading: true,
  needsRegistration: false,
  error: null,
  
  init: async () => {
    try {
      // Check if registration is needed
      const checkResult = await api.checkAuth();
      
      if (checkResult.needsRegistration) {
        set({ loading: false, needsRegistration: true, authenticated: false, error: null });
        return;
      }

      // Try to get current user (validates token)
      const token = api.getToken();
      if (token) {
        try {
          const meResult = await api.getMe();
          if (meResult.success && meResult.user) {
            set({ 
              user: meResult.user, 
              authenticated: true, 
              loading: false,
              needsRegistration: false,
              error: null
            });
            return;
          }
        } catch {
          api.setToken(null);
        }
      }
      
      set({ loading: false, authenticated: false, needsRegistration: false, error: null });
    } catch (err: any) {
      set({ 
        loading: false, 
        authenticated: false,
        error: err.message || 'Не удалось подключиться к серверу'
      });
    }
  },
  
  login: async (username: string, password: string) => {
    try {
      const result = await api.login(username, password);
      
      if (result.success && result.user) {
        set({ user: result.user, authenticated: true, needsRegistration: false, error: null });
        return { success: true };
      }
      
      return { success: false, error: 'Ошибка входа' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка входа' };
    }
  },
  
  register: async (username: string, password: string, email?: string) => {
    try {
      const result = await api.register(username, password, email);
      
      if (result.success && result.user) {
        set({ user: result.user, authenticated: true, needsRegistration: false, error: null });
        return { success: true };
      }
      
      return { success: false, error: 'Ошибка регистрации' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка регистрации' };
    }
  },
  
  logout: async () => {
    await api.logout();
    set({ user: null, authenticated: false, error: null });
  },
}));
