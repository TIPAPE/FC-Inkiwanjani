// frontend/src/services/apiService.js
import { API_BASE_URL } from '../constants/config';
import { authStorage } from '../utils/authStorage';

const apiCall = async (path, options = {}) => {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Only auto‑fetch token if Authorization header is not already set
  // This allows logout to explicitly pass the token
  if (!headers.Authorization) {
    const token = await authStorage.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  // Debug: log the outgoing request
  if (__DEV__) {
    console.log(`[apiCall] ${fetchOptions.method || 'GET'} ${url}`);
  }

  const response = await fetch(url, fetchOptions);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }

  return data;
};

// ─── Gallery ────────────────────────────────────────────────────────────────

export const galleryApi = {
  getAll: () => apiCall('/gallery'),
  getById: (id) => apiCall(`/gallery/${id}`),
  getByMatch: (matchID) => apiCall(`/gallery/match/${matchID}`),
  create: (body) => apiCall('/gallery', { method: 'POST', body }),
  upload: async (formData) => {
    const token = await authStorage.getToken();
    const url = `${API_BASE_URL}/gallery/upload`;
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || `Upload failed (${response.status})`);
    }
    return data;
  },
  delete: (id) => apiCall(`/gallery/${id}`, { method: 'DELETE' }),
};

// ─── Comments ───────────────────────────────────────────────────────────────

export const commentsApi = {
  getAll: () => apiCall('/comments'),
  getAllAdmin: () => apiCall('/admin/comments'),
  create: (body) => apiCall('/comments', { method: 'POST', body }),
  delete: (id) => apiCall(`/admin/comments/${id}`, { method: 'DELETE' }),
  toggleApproval: (id) => apiCall(`/admin/comments/${id}/approve`, { method: 'PUT' }),
};

// ─── Polls ──────────────────────────────────────────────────────────────────

export const pollsApi = {
  getActive: () => apiCall('/polls/active'),
  getResults: (pollID) => apiCall(`/polls/${pollID}/results`),
  vote: (pollID, playerID) => apiCall(`/polls/${pollID}/vote`, {
    method: 'POST',
    body: { playerID },
  }),
  getAll: () => apiCall('/admin/polls'),
  create: (body) => apiCall('/admin/polls', { method: 'POST', body }),
  delete: (id) => apiCall(`/admin/polls/${id}`, { method: 'DELETE' }),
  deactivate: (id) => apiCall(`/admin/polls/${id}/deactivate`, { method: 'PUT' }),
};

// ─── Memberships ────────────────────────────────────────────────────────────

export const membershipsApi = {
  create: (body) => apiCall('/memberships', { method: 'POST', body }),
};

// ─── News Search ────────────────────────────────────────────────────────────

export const newsApi = {
  search: (q) => apiCall(`/news/search?q=${encodeURIComponent(q)}`),
};

// ─── Auth ───────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * Logout – invalidates the current token on the server.
   * @param {string} token - JWT token to invalidate (required)
   */
  logout: async (token) => {
    if (!token) {
      console.warn('[authApi] logout called without token – skipping server request');
      return { success: false };
    }

    const headers = { Authorization: `Bearer ${token}` };
    const url = `${API_BASE_URL}/auth/logout`;

    console.log('[authApi.logout] Sending logout request');
    console.log('[authApi.logout] URL:', url);
    console.log('[authApi.logout] Token preview:', token.substring(0, 20) + '...');

    return apiCall('/auth/logout', { method: 'POST', headers });
  },
};