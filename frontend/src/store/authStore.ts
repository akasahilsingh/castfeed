import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  _id: string;
  userName: string;
  email: string;
  fullName: string;
  avatar: string;
  coverImage: string;
  watchHistory: string[];
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user, isLoading: false }),
      clearUser: () => set({ user: null, isLoading: false }),
      setLoading: (v) => set({ isLoading: v }),
    }),
    { name: "castfeed-auth" }
  )
);
