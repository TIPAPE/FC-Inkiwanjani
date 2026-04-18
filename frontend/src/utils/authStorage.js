// frontend/src/utils/authStorage.js

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@fc_inkiwanjani_token';
const USER_KEY  = '@fc_inkiwanjani_user';

export const authStorage = {

  /**
   * Persists the auth token and serialized user object to AsyncStorage.
   * Returns true on success, false on failure.
   */
  async saveAuth(token, user) {
    try {
      if (!token) throw new Error('Token is required');
      await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [USER_KEY, JSON.stringify(user || {})],
      ]);
      return true;
    } catch (error) {
      console.error('[authStorage] Failed to save auth data:', error);
      return false;
    }
  },

  /**
   * Returns the stored JWT token, or null if not present or on error.
   */
  async getToken() {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('[authStorage] Failed to retrieve token:', error);
      return null;
    }
  },

  /**
   * Returns the stored user object, or null if not present or on error.
   */
  async getUser() {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('[authStorage] Failed to retrieve user data:', error);
      return null;
    }
  },

  /**
   * Returns both the token and user object in a single AsyncStorage read.
   */
  async getAuth() {
    try {
      const [[, token], [, userData]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
      return {
        token: token || null,
        user: userData ? JSON.parse(userData) : null,
      };
    } catch (error) {
      console.error('[authStorage] Failed to retrieve auth data:', error);
      return { token: null, user: null };
    }
  },

  /**
   * Returns true if a token is present in storage.
   */
  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return !!token;
    } catch (error) {
      console.error('[authStorage] Failed to check authentication status:', error);
      return false;
    }
  },

  /**
   * Updates only the stored user object without affecting the token.
   */
  async updateUser(user) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('[authStorage] Failed to update user data:', error);
      return false;
    }
  },

  /**
   * Removes the token and user object from storage.
   * Uses individual removeItem calls as a fallback if multiRemove fails,
   * ensuring at minimum the token is always cleared on logout.
   */
  async clearAuth() {
    try {
      // Log what we're about to clear
      const existingToken = await AsyncStorage.getItem(TOKEN_KEY);
      const existingUser = await AsyncStorage.getItem(USER_KEY);
      console.log('[authStorage] clearAuth - Before clearing:');
      console.log('[authStorage]   Token exists:', !!existingToken);
      console.log('[authStorage]   User exists:', !!existingUser);
      if (existingToken) {
        const tokenPreview = existingToken.substring(0, 20) + '...';
        console.log('[authStorage]   Token preview:', tokenPreview);
      }
      if (existingUser) {
        console.log('[authStorage]   User data:', existingUser.substring(0, 100));
      }

      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      console.log('[authStorage] clearAuth - multiRemove succeeded');

      // Verify removal
      const afterToken = await AsyncStorage.getItem(TOKEN_KEY);
      const afterUser = await AsyncStorage.getItem(USER_KEY);
      console.log('[authStorage] clearAuth - After clearing:');
      console.log('[authStorage]   Token remaining:', !!afterToken);
      console.log('[authStorage]   User remaining:', !!afterUser);

      return true;
    } catch (error) {
      console.error('[authStorage] multiRemove failed, attempting individual removal:', error.message);
      // Fallback: remove keys individually so the token is always wiped
      try { await AsyncStorage.removeItem(TOKEN_KEY); console.log('[authStorage] Individual token removal succeeded'); } catch (e) { console.error('[authStorage] Failed to remove token:', e.message); }
      try { await AsyncStorage.removeItem(USER_KEY);  console.log('[authStorage] Individual user removal succeeded'); } catch (e) { console.error('[authStorage] Failed to remove user:', e.message);  }
      return false;
    }
  },
};