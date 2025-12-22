import axios from "axios";

const api = axios.create({
  baseURL: "https://project-abc-server.vercel.app/api",
  withCredentials: true,
});

export default api;
