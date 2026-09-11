import { create } from 'zustand';
import { User, isAuthenticated, getUser, login as authLogin, logout as authLogout } from '../utils/auth';

interface AuthState {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authenticated: false,
  loading: true,
  
  login: async (username: string, password: string) => {
    set({ loading: true });
    const result = await authLogin(username, password);
    
    if (result.success) {
      set({ user: result.user!, authenticated: true, loading: false });
      return { success: true };
    } else {
      set({ loading: false });
      return { success: false, error: result.error };
    }
  },
  
  logout: () => {
    authLogout();
    set({ user: null, authenticated: false });
  },
  
  init: () => {
    const auth = isAuthenticated();
    const user = getUser();
    set({ authenticated: auth, user, loading: false });
  },
}));
