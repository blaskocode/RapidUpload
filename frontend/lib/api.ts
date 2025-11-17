import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutes - increased for batch operations (1000 photos can take time)
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      // Transform error to user-friendly message
      let message = 'An error occurred';
      
      if (data?.message) {
        message = data.message;
      } else if (data?.error) {
        message = data.error;
      } else {
        switch (status) {
          case 400:
            message = 'Invalid request. Please check your input.';
            break;
          case 401:
            message = 'Unauthorized. Please log in.';
            break;
          case 403:
            message = 'Forbidden. You do not have permission.';
            break;
          case 404:
            message = 'Resource not found.';
            break;
          case 409:
            message = 'Conflict. This resource already exists or has been modified.';
            break;
          case 500:
            message = 'Server error. Please try again later.';
            break;
          case 503:
            message = 'Service temporarily unavailable. Please try again later.';
            break;
          default:
            message = `Error ${status}: ${error.message}`;
        }
      }

      return Promise.reject({
        ...error,
        message,
        status,
        data,
      });
    } else if (error.request) {
      // Request made but no response received
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your connection.',
        status: 0,
      });
    } else {
      // Something else happened
      return Promise.reject({
        ...error,
        message: error.message || 'An unexpected error occurred',
      });
    }
  }
);

export default api;

