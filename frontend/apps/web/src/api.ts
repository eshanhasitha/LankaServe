import axios, { AxiosHeaders } from "axios";
import { auth } from "./firebase.ts";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

export default api;
