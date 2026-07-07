import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { TOKEN_STORAGE_KEY as TOKEN_KEY } from '../constants';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ user, token });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ user: null, token: null });
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        // Token exists; the app will verify it via /api/auth/me
        set({ token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  updateUser: (partial) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...partial } });
    }
  },
}));
