// frontend/src/screens/AdminSignupScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { authService } from '../services/authService';
import { authStorage } from '../utils/authStorage';

const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: '', color: '' };
  let strength = 0;
  let hasLower = /[a-z]/.test(password);
  let hasUpper = /[A-Z]/.test(password);
  let hasNumber = /[0-9]/.test(password);
  let hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (hasLower && hasUpper) strength++;
  if (hasNumber) strength++;
  if (hasSpecial) strength++;
  
  if (strength <= 1) return { strength: 1, label: 'Weak', color: '#FF4444' };
  if (strength <= 2) return { strength: 2, label: 'Fair', color: '#FFA500' };
  if (strength <= 3) return { strength: 3, label: 'Good', color: '#FFD700' };
  return { strength: 4, label: 'Strong', color: '#4CAF50' };
};

export default function AdminSignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    username:        '',
    email:           '',
    password:        '',
    confirmPassword: '',
    full_name:       '',
    role:            'editor',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Validation errors
  const [errors, setErrors] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  // Touched state
  const [touched, setTouched] = useState({
    username: false,
    full_name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const validateField = (field, value) => {
    let error = '';
    
    switch (field) {
      case 'username':
        if (!value.trim()) error = 'Username is required';
        else if (value.trim().length < 3) error = 'Username must be at least 3 characters';
        else if (value.trim().length > 30) error = 'Username must be less than 30 characters';
        else if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) error = 'Username can only contain letters, numbers, and underscores';
        break;
      case 'full_name':
        if (!value.trim()) error = 'Full name is required';
        else if (value.trim().length < 2) error = 'Full name must be at least 2 characters';
        break;
      case 'email':
        if (!value.trim()) error = 'Email is required';
        else if (!validateEmail(value)) error = 'Please enter a valid email address';
        break;
      case 'password':
        if (!value) error = 'Password is required';
        else if (value.length < 8) error = 'Password must be at least 8 characters';
        if (touched.confirmPassword && formData.confirmPassword) {
          if (value !== formData.confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
          } else {
            setErrors(prev => ({ ...prev, confirmPassword: '' }));
          }
        }
        break;
      case 'confirmPassword':
        if (!value) error = 'Please confirm your password';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
      default:
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const handleSignup = async () => {
    const allTouched = {
      username: true,
      full_name: true,
      email: true,
      password: true,
      confirmPassword: true,
    };
    setTouched(allTouched);

    Object.keys(formData).forEach(field => {
      if (field !== 'role') {
        validateField(field, formData[field]);
      }
    });
    
    const username        = formData.username.trim();
    const full_name       = formData.full_name.trim();
    const email           = formData.email.trim().toLowerCase();
    const password        = formData.password;
    const confirmPassword = formData.confirmPassword;
    const role            = formData.role;

    const hasErrors = Object.values(errors).some(error => error !== '');
    const hasEmptyRequired = !username || !email || !password || !full_name;
    
    if (hasErrors || hasEmptyRequired) {
      Alert.alert('Validation Error', 'Please fix the errors before continuing.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.signupAdmin({
        username,
        email,
        password,
        full_name,
        role,
      });

      if (!response?.success || !response?.token || !response?.user) {
        throw new Error(response?.message || 'Admin registration failed');
      }

      const saved = await authStorage.saveAuth(response.token, response.user);
      if (!saved) throw new Error('Failed to save authentication data');

      Alert.alert('Account Created', 'Admin account created successfully.', [
        {
          text: 'Continue',
          onPress: () => {
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Could not create admin account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#000000', '#0D0D0D', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>ADMIN REGISTRATION</Text>
          <View style={styles.sloganRow}>
            <View style={styles.sloganLine} />
            <Text style={styles.headerSlogan}>FC Inkiwanjani Management</Text>
            <View style={styles.sloganLine} />
          </View>
        </LinearGradient>

        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Create Admin Account</Text>
            <View style={styles.formTitleAccent} />
            <Text style={styles.formSubtitle}>Register to manage the club</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>USERNAME *</Text>
            <View style={[styles.inputWrapper, errors.username && touched.username && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor={COLORS.textDim}
                value={formData.username}
                onChangeText={(v) => updateField('username', v)}
                onBlur={() => handleBlur('username')}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            {errors.username && touched.username ? (
              <Text style={styles.errorText}>{errors.username}</Text>
            ) : touched.username && !errors.username && formData.username.trim().length >= 3 ? (
              <Text style={styles.successText}>✓ Username available</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>FULL NAME *</Text>
            <View style={[styles.inputWrapper, errors.full_name && touched.full_name && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textDim}
                value={formData.full_name}
                onChangeText={(v) => updateField('full_name', v)}
                onBlur={() => handleBlur('full_name')}
                editable={!loading}
              />
            </View>
            {errors.full_name && touched.full_name ? (
              <Text style={styles.errorText}>{errors.full_name}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS *</Text>
            <View style={[styles.inputWrapper, errors.email && touched.email && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textDim}
                value={formData.email}
                onChangeText={(v) => updateField('email', v)}
                onBlur={() => handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            {errors.email && touched.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : touched.email && !errors.email && formData.email.trim() ? (
              <Text style={styles.successText}>✓ Valid email</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ADMIN ROLE *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(v) => updateField('role', v)}
                enabled={!loading}
                style={styles.picker}
                dropdownIconColor={COLORS.gold}
              >
                <Picker.Item label="Editor"      value="editor"      color={COLORS.textPrimary} />
                <Picker.Item label="Admin"       value="admin"       color={COLORS.textPrimary} />
                <Picker.Item label="Super Admin" value="super_admin" color={COLORS.textPrimary} />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD *</Text>
            <View style={[styles.inputWrapper, errors.password && touched.password && styles.inputError, styles.passwordWrapper]}>
              <TextInput
                style={[styles.input, { flex: 1, paddingRight: 48 }]}
                placeholder="Create a password (min 8 characters)"
                placeholderTextColor={COLORS.textDim}
                value={formData.password}
                onChangeText={(v) => updateField('password', v)}
                onBlur={() => handleBlur('password')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && touched.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : formData.password ? (
              <View style={styles.passwordStrength}>
                <Text style={[styles.passwordStrengthText, { color: getPasswordStrength(formData.password).color }]}>
                  Password strength: {getPasswordStrength(formData.password).label}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRM PASSWORD *</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && touched.confirmPassword && styles.inputError, styles.passwordWrapper]}>
              <TextInput
                style={[styles.input, { flex: 1, paddingRight: 48 }]}
                placeholder="Re-enter your password"
                placeholderTextColor={COLORS.textDim}
                value={formData.confirmPassword}
                onChangeText={(v) => updateField('confirmPassword', v)}
                onBlur={() => handleBlur('confirmPassword')}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPassword((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && touched.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword ? (
              <Text style={styles.successText}>✓ Passwords match</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#C9A84C', '#FFD700', '#C9A84C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              {loading
                ? <ActivityIndicator color={COLORS.black} size="small" />
                : <Text style={styles.btnPrimaryText}>CREATE ADMIN ACCOUNT</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
              <Text style={styles.loginLinkText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Color tokens
const COLORS = {
  black:       '#000000',
  darkSurface: '#0D0D0D',
  card:        '#111111',
  border:      '#222222',
  inputBg:     '#181818',
  gold:        '#FFD700',
  goldDark:    '#C9A84C',
  goldMuted:   '#A07830',
  textPrimary: '#FFFFFF',
  textMuted:   '#888888',
  textDim:     '#4A4A4A',
};

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.black },
  scrollContent: { flexGrow: 1 },

  header: {
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  sloganRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sloganLine: {
    width: 28,
    height: 1,
    backgroundColor: COLORS.goldMuted,
  },
  headerSlogan: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },

  formContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingHorizontal: 20,
    marginTop: -16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  formHeader: { marginBottom: 24, alignItems: 'center' },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  formTitleAccent: {
    width: 36,
    height: 3,
    backgroundColor: COLORS.gold,
    marginBottom: 10,
    borderRadius: 2,
  },
  formSubtitle: { fontSize: 13, color: COLORS.textMuted },

  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.goldDark,
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  eyeText: {
    fontSize: 18,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: '#FF4444',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#FF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  successText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    marginLeft: 4,
  },
  passwordStrength: {
    marginTop: 4,
    marginLeft: 4,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.inputBg,
  },

  btnPrimary:  { borderRadius: 8, overflow: 'hidden', marginTop: 10 },
  btnGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  btnDisabled: { opacity: 0.5 },

  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  loginText:     { color: COLORS.textMuted, fontSize: 13 },
  loginLinkText: { color: COLORS.gold, fontSize: 13, fontWeight: '700' },
});