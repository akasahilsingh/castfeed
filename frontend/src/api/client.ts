import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "../store/authStore";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

// Separate Axios instance.
// IMPORTANT: refresh requests must not go through the interceptor below.
const refreshClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

const AUTH_URLS = [
  "/users/login",
  "/users/logout",
  "/users/refresh-token",
  "/users/register",
];

let isRefreshing = false;

let refreshSubscribers: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

const subscribeToRefresh = (
  resolve: () => void,
  reject: (error: unknown) => void,
) => {
  refreshSubscribers.push({ resolve, reject });
};

const notifyRefreshSuccess = () => {
  refreshSubscribers.forEach(({ resolve }) => resolve());
  refreshSubscribers = [];
};

const notifyRefreshFailure = (error: unknown) => {
  refreshSubscribers.forEach(({ reject }) => reject(error));
  refreshSubscribers = [];
};

const logoutAndRedirect = () => {
  useAuthStore.getState().clearUser();

  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
};

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest.url ?? "";

    const isAuthEndpoint = AUTH_URLS.some((authUrl) =>
      url.includes(authUrl),
    );

    /*
     * Only attempt refresh for:
     * 401 responses
     * non-auth endpoints
     * requests that haven't already been retried
     */
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    /*
     * Another request is already refreshing the token.
     *
     * Don't start another refresh request.
     * Wait for the existing refresh to finish.
     */
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeToRefresh(
          () => {
            resolve(api(originalRequest));
          },
          (refreshError) => {
            reject(refreshError);
          },
        );
      });
    }

    /*
     * This request becomes responsible for refreshing
     * the access token.
     */
    isRefreshing = true;

    try {
      await refreshClient.post("/users/refresh-token");

      /*
       * Backend has now set the new accessToken
       * and refreshToken cookies.
       */
      notifyRefreshSuccess();

      /*
       * Retry the original request.
       */
      return api(originalRequest);
    } catch (refreshError) {
      notifyRefreshFailure(refreshError);

      logoutAndRedirect();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;