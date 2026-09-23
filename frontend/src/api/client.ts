import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

// Auth endpoints that must NEVER trigger the refresh-redirect loop
const AUTH_URLS = ["/users/login", "/users/logout", "/users/refresh-token", "/users/register", "/users/current-user"];

// Intercept 401 → silently refresh token → retry once
// SKIP for auth endpoints — a wrong-password 401 must reach the caller as a normal error
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url: string = original?.url ?? "";
    const isAuthEndpoint = AUTH_URLS.some((u) => url.includes(u));

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        await axios.post("/api/v1/users/refresh-token", {}, { withCredentials: true });
        return api(original);
      } catch {
        // Refresh also failed — send to login only if not already there
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
