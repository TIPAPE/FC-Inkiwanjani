// frontend/src/screens/UserSignupScreen.js
import React, { useState, useCallback, memo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../services/authService';
import { authStorage } from '../utils/authStorage';

const validateEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validatePhone = v => {
  if (!v || v.trim() === '') return true;
  return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}$/.test(v.trim());
};
const pwStrength = pw => {
  if (!pw) return { label: '', color: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) s++;
  if (s <= 1) return { label: 'Weak', color: '#E74C3C' };
  if (s <= 2) return { label: 'Fair', color: '#F39C12' };
  if (s <= 3) return { label: 'Good', color: '#2E86C1' };
  return { label: 'Strong', color: '#27AE60' };
};

const C = {
  card: 'rgba(255,255,255,0.95)',
  accent: '#2E86C1',
  navy: '#1B4F72',
  secText: '#5D6D7E',
  muted: '#85929E',
  red: '#E74C3C',
  green: '#27AE60',
  white: '#FFFFFF',
};
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

// Memoized Field component to prevent unnecessary re-renders that steal focus
const Field = memo(({
  label,
  field,
  value,
  onChangeText,
  onBlur,
  error,
  touched,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  editable,
  showEye,
  onToggleEye,
}) => {
  const inputStyle = [ST.input, showEye && { paddingRight: 44 }];
  return (
    <View style={ST.field}>
      <Text style={ST.label}>{label}</Text>
      <View style={[ST.inputWrapper, error && touched && ST.inputError]}>
        <TextInput
          style={inputStyle}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
        />
        {showEye && (
          <TouchableOpacity style={ST.eyeButton} onPress={onToggleEye}>
            <Text style={{ fontSize: 18 }}>{secureTextEntry ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && touched ? <Text style={ST.errorText}>{error}</Text> : null}
      {!error && touched && value?.trim() ? <Text style={ST.okText}>✓ Valid</Text> : null}
    </View>
  );
});

export default function UserSignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({
    username: false,
    full_name: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
  });

  const validate = useCallback((field, value) => {
    let err = '';
    switch (field) {
      case 'username':
        if (!value.trim()) err = 'Required';
        else if (value.trim().length < 3) err = 'Min 3 chars';
        else if (!/^[a-zA-Z0-9_]+$/.test(value.trim()))
          err = 'Letters, numbers, underscores only';
        break;
      case 'full_name':
        if (!value.trim()) err = 'Required';
        else if (value.trim().length < 2) err = 'Min 2 chars';
        break;
      case 'email':
        if (!value.trim()) err = 'Required';
        else if (!validateEmail(value)) err = 'Invalid email';
        break;
      case 'phone':
        if (value.trim() && !validatePhone(value)) err = 'Invalid phone';
        break;
      case 'password':
        if (!value) err = 'Required';
        else if (value.length < 8) err = 'Min 8 chars';
        // cross‑field validation for confirmPassword is handled in its own validate call
        if (touched.confirmPassword && formData.confirmPassword) {
          setErrors(prev => ({
            ...prev,
            confirmPassword: value !== formData.confirmPassword ? 'Passwords do not match' : '',
          }));
        }
        break;
      case 'confirmPassword':
        if (!value) err = 'Required';
        else if (value !== formData.password) err = 'Passwords do not match';
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [field]: err }));
  }, [formData.password, formData.confirmPassword, touched.confirmPassword]);

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) validate(field, value);
  }, [touched, validate]);

  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validate(field, formData[field]);
  }, [formData, validate]);

  const handleSignup = async () => {
    // Mark all fields as touched
    const allTouched = {
      username: true,
      full_name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    };
    setTouched(allTouched);
    // Validate all
    Object.keys(formData).forEach(f => validate(f, formData[f]));
    if (
      Object.values(errors).some(e => e) ||
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.full_name.trim()
    ) {
      Alert.alert('Validation Error', 'Please fix the errors.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.signupUser({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
      });
      if (!res?.success || !res?.token || !res?.user)
        throw new Error(res?.message || 'Registration failed');
      await authStorage.saveAuth(res.token, res.user);
      Alert.alert('Account Created', 'Welcome to The Wolves family!', [
        { text: 'Continue', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }) },
      ]);
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Could not create account.');
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
        <ScrollView contentContainerStyle={ST.scroll} keyboardShouldPersistTaps="handled">
          <View style={ST.header}>
            <Text style={ST.headerTitle}>JOIN THE PACK</Text>
            <Text style={ST.slogan}>Become part of The Wolves family</Text>
          </View>

          <View style={ST.card}>
            <Text style={ST.cardTitle}>Create Account</Text>
            <Text style={ST.cardSubtitle}>Sign up to access exclusive features</Text>

            <Field
              label="Username"
              field="username"
              value={formData.username}
              onChangeText={(v) => updateField('username', v)}
              onBlur={() => handleBlur('username')}
              error={errors.username}
              touched={touched.username}
              placeholder="Choose a username"
              autoCapitalize="none"
              editable={!loading}
            />

            <Field
              label="Full Name"
              field="full_name"
              value={formData.full_name}
              onChangeText={(v) => updateField('full_name', v)}
              onBlur={() => handleBlur('full_name')}
              error={errors.full_name}
              touched={touched.full_name}
              placeholder="Enter your full name"
              editable={!loading}
            />

            <Field
              label="Email Address"
              field="email"
              value={formData.email}
              onChangeText={(v) => updateField('email', v)}
              onBlur={() => handleBlur('email')}
              error={errors.email}
              touched={touched.email}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Field
              label="Phone (Optional)"
              field="phone"
              value={formData.phone}
              onChangeText={(v) => updateField('phone', v)}
              onBlur={() => handleBlur('phone')}
              error={errors.phone}
              touched={touched.phone}
              placeholder="+254 700 000 000"
              keyboardType="phone-pad"
              editable={!loading}
            />

            {/* Password field */}
            <View style={ST.field}>
              <Text style={ST.label}>Password</Text>
              <View style={[ST.inputWrapper, errors.password && touched.password && ST.inputError]}>
                <TextInput
                  style={[ST.input, { paddingRight: 44 }]}
                  value={formData.password}
                  onChangeText={(v) => updateField('password', v)}
                  onBlur={() => handleBlur('password')}
                  placeholder="Min 8 characters"
                  placeholderTextColor={C.muted}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity style={ST.eyeButton} onPress={() => setShowPw(v => !v)}>
                  <Text style={{ fontSize: 18 }}>{showPw ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {errors.password && touched.password ? (
                <Text style={ST.errorText}>{errors.password}</Text>
              ) : formData.password ? (
                <Text style={[ST.pwStrength, { color: pwStrength(formData.password).color }]}>
                  Strength: {pwStrength(formData.password).label}
                </Text>
              ) : null}
            </View>

            {/* Confirm Password field */}
            <View style={ST.field}>
              <Text style={ST.label}>Confirm Password</Text>
              <View style={[ST.inputWrapper, errors.confirmPassword && touched.confirmPassword && ST.inputError]}>
                <TextInput
                  style={[ST.input, { paddingRight: 44 }]}
                  value={formData.confirmPassword}
                  onChangeText={(v) => updateField('confirmPassword', v)}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder="Re-enter password"
                  placeholderTextColor={C.muted}
                  secureTextEntry={!showPw2}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity style={ST.eyeButton} onPress={() => setShowPw2(v => !v)}>
                  <Text style={{ fontSize: 18 }}>{showPw2 ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && touched.confirmPassword ? (
                <Text style={ST.errorText}>{errors.confirmPassword}</Text>
              ) : touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword ? (
                <Text style={ST.okText}>✓ Passwords match</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[ST.signupButton, loading && ST.signupButtonDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={ST.signupButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={ST.loginRow}>
              <Text style={ST.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
                <Text style={ST.loginLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
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
    maxWidth: 440,
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
  inputError: {
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
  okText: {
    fontSize: 10,
    color: C.green,
    marginTop: 3,
    marginLeft: 4,
  },
  pwStrength: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    marginLeft: 4,
  },

  signupButton: {
    backgroundColor: C.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: C.accent,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 1,
  },

  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  loginText: {
    fontSize: 11,
    color: C.muted,
  },
  loginLink: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accent,
  },
});