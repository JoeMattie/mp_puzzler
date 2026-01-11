// packages/client/src/stores/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

interface AuthState {
  token: string | null;
  sessionId: string | null;
  displayName: string | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      sessionId: null,
      displayName: null,
      isLoading: true,

      initialize: async () => {
        const { token } = get();

        if (token) {
          try {
            const session = await api.auth.me();
            set({
              sessionId: session.sessionId,
              displayName: session.displayName,
              isLoading: false,
            });
            return;
          } catch {
            // Token invalid, create new anonymous session
          }
        }

        // Create anonymous session
        const session = await api.auth.anonymous();
        localStorage.setItem('token', session.token);
        set({
          token: session.token,
          sessionId: session.sessionId,
          displayName: session.displayName,
          isLoading: false,
        });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, sessionId: null, displayName: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
