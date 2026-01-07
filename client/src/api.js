import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true
});

const getError = (err) => {
  if (err.response?.data?.error) return err.response.data.error;
  return err.message || "Request failed";
};

export const authApi = {
  signup: (data) => api.post("/auth/signup", data).then((r) => r.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data)
};

export const childApi = {
  list: () => api.get("/children").then((r) => r.data),
  create: (data) => api.post("/children", data).then((r) => r.data),
  update: (id, data) => api.put(`/children/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/children/${id}`).then((r) => r.data)
};

export const questionApi = {
  ask: (data) => api.post("/question/ask", data).then((r) => r.data),
  history: (params) => api.get("/question/history", { params }).then((r) => r.data),
  feedback: (id, data) => api.post(`/question/${id}/feedback`, data).then((r) => r.data)
};

export { getError };
