// frontend/src/navigation/AppNavigator.js
import React, { useState, useEffect, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { resetTo } from './navigationRef';

// Screens (Main App)
import HomeScreen from '../screens/HomeScreen';
import FixturesScreen from '../screens/FixturesScreen';
import TicketsScreen from '../screens/TicketsScreen';
import SquadScreen from '../screens/SquadScreen';
import GalleryScreen from '../screens/GalleryScreen';
import NewsScreen from '../screens/NewsScreen';
import AboutScreen from '../screens/AboutScreen';
import FanZoneScreen from '../screens/FanZoneScreen';
import AdminScreen from '../screens/AdminScreen';
import ReportsScreen from '../screens/ReportsScreen';
import HelpScreen from '../screens/HelpScreen';

// Screens (Auth)
import LoginScreen from '../screens/LoginScreen';
import AdminSignupScreen from '../screens/AdminSignupScreen';
import UserSignupScreen from '../screens/UserSignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// Utils
import { authStorage } from '../utils/authStorage';
import { authApi } from '../services/apiService';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.loadingLogo}><Text style={styles.loadingLogoText}>W</Text></View>
      <ActivityIndicator size="large" color="#2E86C1" style={{ marginTop: 16 }} />
    </View>
  );
}

export default function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const userIsAdmin = useCallback((user) => {
    if (!user) return false;
    if (user.isAdmin === true) return true;
    if (user.type === 'admin') return true;
    if (typeof user.role === 'string' && ['super_admin', 'admin', 'editor'].includes(user.role)) return true;
    return false;
  }, []);

  // Restore session on app start
  useEffect(() => {
    const init = async () => {
      try {
        const authenticated = await authStorage.isAuthenticated();
        if (authenticated) {
          const user = await authStorage.getUser();
          setIsLoggedIn(true);
          setIsAdmin(userIsAdmin(user));
          console.log('[AppNavigator] Session restored, user is admin:', userIsAdmin(user));
        } else {
          setIsLoggedIn(false);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('[AppNavigator] Failed to init auth state:', error);
        setIsLoggedIn(false);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
        setAuthReady(true);
      }
    };
    init();
  }, [userIsAdmin]);

  // Reset navigation when auth state changes
  useEffect(() => {
    if (authReady && !isLoading) {
      if (isLoggedIn) {
        console.log('[AppNavigator] Navigating to:', isAdmin ? 'Admin' : 'Home');
        resetTo(isAdmin ? 'Admin' : 'Home');
      } else {
        console.log('[AppNavigator] Navigating to Login');
        resetTo('Login');
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, authReady]);

  const handleLogin = useCallback(async (user) => {
    if (!user) {
      console.error('[AppNavigator] handleLogin called with no user data');
      return;
    }
    const admin = userIsAdmin(user);
    setIsLoggedIn(true);
    setIsAdmin(admin);
  }, [userIsAdmin]);

  const handleLogout = async () => {
    console.log('[LOGOUT] ========== LOGOUT STARTED ==========');
    try {
      // 1. Get token BEFORE clearing storage
      const token = await authStorage.getToken();
      console.log('[LOGOUT] Token exists:', !!token);
      if (token) {
        console.log('[LOGOUT] Token preview:', token.substring(0, 20) + '...');
      }

      // 2. Attempt server logout (non‑blocking)
      if (token) {
        try {
          await authApi.logout(token);
          console.log('[LOGOUT] Server acknowledged logout, token added to blocklist');
        } catch (serverError) {
          console.warn('[LOGOUT] Server logout failed (non-critical):', serverError.message);
        }
      } else {
        console.log('[LOGOUT] No token found, skipping server logout');
      }

      // 3. Clear local storage
      await authStorage.clearAuth();
      console.log('[LOGOUT] Auth storage cleared');

      // 4. Update state (triggers navigation via useEffect)
      setIsLoggedIn(false);
      setIsAdmin(false);

      console.log('[LOGOUT] ========== LOGOUT COMPLETED ==========');
    } catch (error) {
      console.error('[LOGOUT] ERROR during logout:', error.message);
      // Force state update even on error
      setIsLoggedIn(false);
      setIsAdmin(false);
      console.log('[LOGOUT] ========== LOGOUT COMPLETED (with error) ==========');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isLoggedIn) {
    return (
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isAdmin ? 'Admin' : 'Home'}
      >
        <Stack.Screen name="Home">
          {(props) => <HomeScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="Fixtures">
          {(props) => <FixturesScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="Tickets">
          {(props) => <TicketsScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="Players">
          {(props) => <SquadScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="Gallery">
          {(props) => <GalleryScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="News">
          {(props) => <NewsScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="About">
          {(props) => <AboutScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="FanZone">
          {(props) => <FanZoneScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="Reports">
          {(props) => <ReportsScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="Help">
          {(props) => <HelpScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="Admin">
          {(props) => <AdminScreen {...props} onLogout={handleLogout } />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Login"
    >
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
      </Stack.Screen>
      <Stack.Screen name="UserSignup" component={UserSignupScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminSignup" component={AdminSignupScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#AED6F1',
  },
  loadingLogo: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2E86C1', alignItems: 'center', justifyContent: 'center' },
  loadingLogoText: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
});