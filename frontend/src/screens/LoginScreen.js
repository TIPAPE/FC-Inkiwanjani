// frontend/src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../services/authService';
import { authStorage } from '../utils/authStorage';

const C = {
  card: 'rgba(255,255,255,0.95)',
  accent: '#2E86C1',
  navy: '#1B4F72',
  secText: '#5D6D7E',
  muted: '#85929E',
  red: '#E74C3C',
  white: '#FFFFFF',
};
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9']; // Light blue gradient retained

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

  const handleLogin = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !validateEmail(cleanEmail) || !password.trim()) return;
    setLoading(true);
    try {
      const result = await authService.login(cleanEmail, password);
      if (!result.success || !result.token) throw new Error('Login failed');
      await authStorage.saveAuth(result.token, result.user);
      if (onLogin) onLogin(result.user);
    } catch (error) {
      const msg = String(error?.message || '').toLowerCase();
      let errMsg = 'Login failed. Please try again.';
      if (msg.includes('timeout')) errMsg = 'Request timed out. Check your connection.';
      else if (msg.includes('network') || msg.includes('failed to fetch'))
        errMsg = 'Network error. Check your internet connection.';
      else if (msg.includes('invalid email or password')) errMsg = 'Invalid email or password.';
      else if (msg.includes('cannot connect'))
        errMsg = 'Cannot connect to server. Ensure backend is running.';
      else if (error?.message) errMsg = error.message;
      Alert.alert('Login Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ScrollView
          contentContainerStyle={ST.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Clean header */}
          <View style={ST.header}>
            <Text style={ST.headerTitle}>FC INKIWANJANI</Text>
            <Text style={ST.slogan}>The Pride of Mile 46</Text>
          </View>

          {/* Smaller, compact card */}
          <View style={ST.card}>
            <Text style={ST.cardTitle}>Welcome back</Text>
            <Text style={ST.cardSubtitle}>Sign in to continue</Text>

            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              onBlur={() => {
                setEmailTouched(true);
                if (!email.trim()) setEmailError('Email is required');
                else if (!validateEmail(email)) setEmailError('Invalid email');
                else setEmailError('');
              }}
              error={emailTouched ? emailError : ''}
              keyboardType="email-address"
              placeholder="your@email.com"
              editable={!loading}
              autoCapitalize="none"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              onBlur={() => {
                setPasswordTouched(true);
                if (!password.trim()) setPasswordError('Password is required');
                else setPasswordError('');
              }}
              error={passwordTouched ? passwordError : ''}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              editable={!loading}
              autoCapitalize="none"
              showEye
              onToggleEye={() => setShowPassword((v) => !v)}
            />

            <TouchableOpacity
              style={ST.forgotLink}
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={loading}
            >
              <Text style={ST.forgotLinkText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ST.loginButton, loading && ST.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={ST.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={ST.divider}>
              <View style={ST.dividerLine} />
              <Text style={ST.dividerText}>OR</Text>
              <View style={ST.dividerLine} />
            </View>

            <Text style={ST.signupText}>Don't have an account?</Text>
            <TouchableOpacity
              style={ST.signupButton}
              onPress={() => navigation.navigate('UserSignup')}
              disabled={loading}
            >
              <Text style={ST.signupButtonText}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Field({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  keyboardType,
  placeholder,
  editable,
  autoCapitalize,
  secureTextEntry,
  showEye,
  onToggleEye,
}) {
  return (
    <View style={ST.field}>
      <Text style={ST.label}>{label}</Text>
      <View style={[ST.inputWrapper, error && ST.inputWrapperError]}>
        <TextInput
          style={[ST.input, showEye && { paddingRight: 44 }]}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          secureTextEntry={secureTextEntry}
        />
        {showEye && (
          <TouchableOpacity style={ST.eyeButton} onPress={onToggleEye}>
            <Text style={{ fontSize: 18 }}>{secureTextEntry ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={ST.errorText}>{error}</Text> : null}
    </View>
  );
}

const ST = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 30, justifyContent: 'center' },

  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: C.navy,
    letterSpacing: 2,
  },
  slogan: {
    fontSize: 12,
    color: C.secText,
    marginTop: 4,
    fontStyle: 'italic',
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.navy,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 18,
  },

  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: C.navy,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: C.navy + '20',
    borderRadius: 10,
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapperError: {
    borderColor: C.red,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.navy,
    flex: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  errorText: {
    fontSize: 10,
    color: C.red,
    marginTop: 3,
    marginLeft: 4,
  },

  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    marginBottom: 14,
  },
  forgotLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.accent,
  },

  loginButton: {
    backgroundColor: C.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 1,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.navy + '15',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 10,
    color: C.muted,
  },

  signupText: {
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  signupButton: {
    borderWidth: 1.5,
    borderColor: C.accent,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  signupButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.accent,
  },
});