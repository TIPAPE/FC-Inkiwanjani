// frontend/src/services/authService.js

import { API_BASE_URL } from '../constants/config';
import { authStorage } from '../utils/authStorage';

// Strip trailing /api to get the server root
const API_ROOT = API_BASE_URL.replace(/\/api$/, '');

/**
 * Wraps fetch with an abort-based timeout to prevent hung requests.
 */
const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error('Request timeout. Please check your internet connection.');
    }
    throw error;
  }
};

/**
 * Safely parses a JSON response body.
 * Returns null instead of throwing on malformed or non-JSON responses.
 */
const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * Unified HTTP request handler with auth header injection and error normalisation.
 */
const request = async (path, { method = 'GET', token, body } = {}) => {
  const url = `${API_ROOT}${path}`;

  const headers = { Accept: 'application/json' };
  if (method !== 'GET') headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = { method, headers };
  if (body !== undefined) options.body = JSON.stringify(body);

  let response;
  try {
    response = await fetchWithTimeout(url, options, 10000);
  } catch (error) {
    console.error(`[authService] Network error on ${method} ${url}:`, error);
    throw new Error(error?.message || 'Unable to connect to server');
  }

  const data = await safeJson(response);

  if (!data && !response.ok) {
    throw new Error(`Server error (${response.status}). Please try again.`);
  }
  if (!response.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data;
};

export const authService = {

  /**
   * Authenticates a user or admin and returns a signed JWT on success.
   */
  async login(email, password) {
    try {
      if (__DEV__) console.log('[authService] Login attempt for:', email);
      const result = await request('/api/auth/login', { method: 'POST', body: { email, password } });
      if (__DEV__) console.log('[authService] Login result:', {
        success: result?.success,
        hasToken: !!result?.token,
        hasUser: !!result?.user
      });
      return result;
    } catch (error) {
      console.error('[authService] Login failed:', error);
      throw new Error(error?.message || 'Login failed');
    }
  },

  /**
   * Registers a new regular user account.
   */
  async signupUser(userData) {
    try {
      return await request('/api/auth/signup/user', { method: 'POST', body: userData });
    } catch (error) {
      console.error('[authService] User signup failed:', error);
      throw new Error(error?.message || 'Registration failed');
    }
  },

  /**
   * Registers a new admin account.
   */
  async signupAdmin(adminData) {
    try {
      return await request('/api/auth/signup/admin', { method: 'POST', body: adminData });
    } catch (error) {
      console.error('[authService] Admin signup failed:', error);
      throw new Error(error?.message || 'Admin registration failed');
    }
  },

  /**
   * Verifies a JWT token against the server.
   * Returns true if valid, false on any failure or network error.
   */
  async verifyToken(token) {
    try {
      const data = await request('/api/auth/verify', { token });
      return !!(data?.success ?? data?.valid ?? false);
    } catch (error) {
      console.error('[authService] Token verification failed:', error);
      return false;
    }
  },

  /**
   * Fetches the authenticated user's profile using a valid token.
   */
  async getProfile(token) {
    try {
      return await request('/api/auth/profile', { token });
    } catch (error) {
      console.error('[authService] Profile fetch failed:', error);
      throw new Error(error?.message || 'Failed to fetch profile');
    }
  },

  /**
   * Returns the resolved API base URL for diagnostic purposes.
   */
  getApiBase() {
    return API_ROOT;
  },
};