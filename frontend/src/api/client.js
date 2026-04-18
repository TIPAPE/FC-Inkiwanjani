// frontend/src/api/client.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

const API_ROOT = API_BASE_URL.replace(/\/api$/, '');

// Storage keys (must match authStorage.js)
const TOKEN_KEY = '@fc_inkiwanjani_token';
const USER_KEY = '@fc_inkiwanjani_user';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('[client] Error adding auth token:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage
      try {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      } catch (e) {
        console.error('[client] Failed to clear auth on 401:', e);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };