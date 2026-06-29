import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_URL = (configuredApiUrl || "http://localhost:5000").replace(/\/+$/, "");

export const api = axios.create({
  baseURL: `${API_URL}/api`
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("connectify-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response && import.meta.env.PROD && API_URL.includes("localhost")) {
      return "The deployed frontend is still pointing to localhost. Set VITE_API_URL to your deployed backend URL and redeploy.";
    }
    return error.response?.data?.message ?? error.message;
  }
  return "Something went wrong";
}
