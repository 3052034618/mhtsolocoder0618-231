import { create } from 'zustand';
import type { User, RegisterRequest } from '../../shared/types';
import { auth } from '../services/api';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UiState {
  toast: Toast | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

type StoreState = AuthState & UiState;

export const useStore = create<StoreState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const data = await auth.login({ email, password });
      localStorage.setItem('token', data.token);
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true
      });
      get().showToast('登录成功', 'success');
    } catch (error) {
      get().showToast(error instanceof Error ? error.message : '登录失败', 'error');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  register: async (data: RegisterRequest) => {
    set({ loading: true });
    try {
      const response = await auth.register(data);
      localStorage.setItem('token', response.token);
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true
      });
      get().showToast('注册成功', 'success');
    } catch (error) {
      get().showToast(error instanceof Error ? error.message : '注册失败', 'error');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      token: null,
      user: null,
      isAuthenticated: false
    });
    get().showToast('已退出登录', 'info');
  },

  fetchCurrentUser: async () => {
    if (!get().token) return;
    set({ loading: true });
    try {
      const user = await auth.getMe();
      set({
        user,
        isAuthenticated: true
      });
    } catch (error) {
      localStorage.removeItem('token');
      set({
        token: null,
        user: null,
        isAuthenticated: false
      });
    } finally {
      set({ loading: false });
    }
  },

  toast: null,
  showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => {
      if (get().toast?.message === message) {
        set({ toast: null });
      }
    }, 3000);
  },
  hideToast: () => set({ toast: null }),

  loading: false,
  setLoading: (loading: boolean) => set({ loading })
}));
