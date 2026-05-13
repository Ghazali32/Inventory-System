import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenManager } from '../utils/tokenManager';
import { getDeviceId } from '../utils/device';

// Use environment variable or fallback
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.example.com';

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor — attach auth headers
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const [accessToken, deviceId] = await Promise.all([
      tokenManager.getAccessToken(),
      getDeviceId(),
    ]);

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    config.headers['X-Device-Id'] = deviceId;

    // Log request details
    console.log('\n========== HTTP REQUEST ==========');
    console.log('Method:', config.method?.toUpperCase());
    console.log('URL:', config.baseURL + config.url);
    console.log('Headers:', config.headers);
    if (config.data) {
      console.log('Data:', JSON.stringify(config.data, null, 2));
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 with token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response
    console.log('\n========== HTTP RESPONSE ==========');
    console.log('Status:', response.status, response.statusText);
    console.log('URL:', response.config.url);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    return response;
  },
  async (error: AxiosError) => {
    console.log('\n========== HTTP ERROR ==========');
    console.log('Status:', error.response?.status, error.response?.statusText);
    console.log('URL:', error.config?.url);
    console.log('Error Message:', error.message);
    console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
    
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If the error is not 401 or we've already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await tokenManager.getRefreshToken();

      if (!refreshToken) {
        // No refresh token — force logout
        await tokenManager.clearTokens();
        processQueue(error, null);
        return Promise.reject(error);
      }

      console.log('\n========== REFRESHING TOKEN ==========');
      const response = await axios.post(`${BASE_URL}/api/auth/refresh/`, {
        refresh: refreshToken,
      });

      const { access, refresh: newRefresh } = response.data;
      // Save both the new access and refresh tokens
      await tokenManager.saveTokens({
        access,
        refresh: newRefresh,
      });

      console.log('Token refreshed successfully');
      processQueue(null, access);

      originalRequest.headers.Authorization = `Bearer ${access}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed — clear tokens and force logout
      console.error('Token refresh failed:', refreshError);
      await tokenManager.clearTokens();
      processQueue(refreshError as AxiosError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
