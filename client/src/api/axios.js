import axios from "axios";

const isLocalhost = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

const api = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    (isLocalhost ? "http://localhost:3001/api" : "https://project-abc-server.vercel.app/api"),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
