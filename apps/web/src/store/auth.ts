import { create } from "zustand";
import { api } from "../lib/api";
import type { User } from "../types";

type AuthState = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setSession: (token: string, user: User) => void;
  hydrate: () => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
};

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("connectify-token"),
  user: null,
  isLoading: true,
  setSession: (token, user) => {
    localStorage.setItem("connectify-token", token);
    set({ token, user });
  },
  hydrate: async () => {
    const token = localStorage.getItem("connectify-token");
    if (!token) {
      set({ isLoading: false, user: null, token: null });
      return;
    }
    try {
      const { data } = await api.get("/users/me");
      set({ user: data.user, token, isLoading: false });
    } catch {
      localStorage.removeItem("connectify-token");
      set({ user: null, token: null, isLoading: false });
    }
  },
  logout: () => {
    localStorage.removeItem("connectify-token");
    set({ user: null, token: null });
  },
  updateUser: (user) => set({ user })
}));
