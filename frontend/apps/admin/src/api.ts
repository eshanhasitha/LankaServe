import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
