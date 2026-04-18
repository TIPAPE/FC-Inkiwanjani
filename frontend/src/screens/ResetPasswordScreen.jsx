// frontend/src/screens/ResetPasswordScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../constants/config';

const C = {
  card: 'rgba(255,255,255,0.9)',
  accent: '#2E86C1',
  navy: '#1B4F72',
  secText: '#5D6D7E',
  muted: '#85929E',
  red: '#E74C3C',
  green: '#27AE60',
  white: '#FFFFFF',
};
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

export default function ResetPasswordScreen({ navigation, route }) {
  const { email, token: initialToken } = route.params || {};

  const [token, setToken] = useState(initialToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const validatePassword = (pwd) => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleResetPassword = async () => {
    // Validate
    const pwdErr = validatePassword(newPassword);
    setPasswordError(pwdErr);
    if (pwdErr) return;

    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match');
      return;
    }
    setConfirmError('');

    if (!token.trim()) {
      Alert.alert('Error', 'Reset token is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email?.trim().toLowerCase(),
          token: token.trim(),
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Password reset failed');
      }

      Alert.alert(
        'Success',
        'Your password has been reset successfully.',
        [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
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

        {/* Header */}
        <View style={ST.header}>
          <TouchableOpacity
            style={ST.backBtn}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={ST.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={ST.iconCircle}>
            <Text style={ST.iconText}>🔒</Text>
          </View>
          <Text style={ST.headerTitle}>Reset Password</Text>
          <Text style={ST.headerSubtitle}>
            Create a new password for {email || 'your account'}
          </Text>
        </View>

        {/* Form Card */}
        <View style={ST.form}>
          <Text style={ST.formTitle}>New Password</Text>
          <View style={ST.formLine} />
          <Text style={ST.formSub}>Enter your reset token and new password</Text>

          {/* Token Field */}
          <View style={ST.field}>
            <Text style={ST.label}>Reset Token</Text>
            <View style={ST.inputWrap}>
              <TextInput
                style={ST.input}
                value={token}
                onChangeText={setToken}
                placeholder="Paste reset token"
                placeholderTextColor={C.muted}
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </View>

          {/* New Password */}
          <View style={ST.field}>
            <Text style={ST.label}>New Password</Text>
            <View style={[ST.inputWrap, passwordError && ST.inputErr]}>
              <TextInput
                style={ST.input}
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  setPasswordError('');
                }}
                onBlur={() => setPasswordError(validatePassword(newPassword))}
                placeholder="Min. 6 characters"
                placeholderTextColor={C.muted}
                secureTextEntry
                editable={!loading}
              />
            </View>
            {passwordError ? <Text style={ST.errText}>{passwordError}</Text> : null}
          </View>

          {/* Confirm Password */}
          <View style={ST.field}>
            <Text style={ST.label}>Confirm Password</Text>
            <View style={[ST.inputWrap, confirmError && ST.inputErr]}>
              <TextInput
                style={ST.input}
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setConfirmError('');
                }}
                onBlur={() => {
                  if (newPassword !== confirmPassword) {
                    setConfirmError('Passwords do not match');
                  }
                }}
                placeholder="Re-enter password"
                placeholderTextColor={C.muted}
                secureTextEntry
                editable={!loading}
              />
            </View>
            {confirmError ? <Text style={ST.errText}>{confirmError}</Text> : null}
          </View>

          <TouchableOpacity
            style={[ST.btn, loading && ST.btnOff]}
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Text style={ST.btnText}>RESET PASSWORD</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={ST.linkBtn}
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text style={ST.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const ST = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: C.navy },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: C.accent,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconText: { fontSize: 32 },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: C.navy,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  form: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.navy,
    marginBottom: 4,
  },
  formLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.accent,
    marginBottom: 8,
  },
  formSub: { fontSize: 13, color: C.muted, marginBottom: 20 },

  field: { marginBottom: 14 },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: C.navy,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: C.navy + '15',
    borderRadius: 12,
    backgroundColor: C.white,
  },
  inputErr: { borderColor: C.red },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.navy,
  },
  errText: { fontSize: 11, color: C.red, marginTop: 4, marginLeft: 4 },

  btn: {
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: C.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  btnOff: { opacity: 0.6 },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 2,
  },

  linkBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 13, fontWeight: '600', color: C.accent },
});