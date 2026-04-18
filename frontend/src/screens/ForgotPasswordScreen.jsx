// frontend/src/screens/ForgotPasswordScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../constants/config';

const C = { card: 'rgba(255,255,255,0.9)', accent: '#2E86C1', navy: '#1B4F72', secText: '#5D6D7E', muted: '#85929E', red: '#E74C3C', green: '#27AE60', white: '#FFFFFF' };
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const validateEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

  const handleSendReset = async () => {
    setEmailTouched(true);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setEmailError('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send reset code');
      }

      // In development, the token is returned in the response
      if (data.token) {
        setResetToken(data.token);
      }

      setRequestSent(true);
      Alert.alert(
        'Reset Code Sent',
        'A password reset code has been generated. In development mode, check the console for the token.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('ResetPassword', { email: email.trim().toLowerCase(), token: resetToken });
  };

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={ST.header}>
          <TouchableOpacity style={ST.backBtn} onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={ST.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={ST.iconCircle}>
            <Text style={ST.iconText}>🔑</Text>
          </View>
          <Text style={ST.headerTitle}>Forgot Password?</Text>
          <Text style={ST.headerSubtitle}>
            {requestSent
              ? 'Enter your new password below'
              : 'Enter your email and we\'ll send you a reset code'}
          </Text>
        </View>

        {/* Form Card */}
        <View style={ST.form}>
          {!requestSent ? (
            <>
              <Text style={ST.formTitle}>Request Reset Code</Text>
              <View style={ST.formLine} />
              <Text style={ST.formSub}>We'll send a reset token to your email</Text>

              <View style={ST.field}>
                <Text style={ST.label}>Email Address</Text>
                <View style={[ST.inputWrap, emailError && emailTouched && ST.inputErr]}>
                  <TextInput
                    style={ST.input}
                    value={email}
                    onChangeText={v => { setEmail(v); setEmailError(''); }}
                    onBlur={() => {
                      setEmailTouched(true);
                      if (!email.trim()) setEmailError('Email is required');
                      else if (!validateEmail(email)) setEmailError('Please enter a valid email');
                    }}
                    placeholder="Enter your email"
                    placeholderTextColor={C.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
                {emailError && emailTouched ? <Text style={ST.errText}>{emailError}</Text> : null}
              </View>

              <TouchableOpacity style={[ST.btn, loading && ST.btnOff]} onPress={handleSendReset} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={C.white} size="small" /> : <Text style={ST.btnText}>SEND RESET CODE</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={ST.formTitle}>Enter Reset Code</Text>
              <View style={ST.formLine} />
              <Text style={ST.formSub}>Use the token sent to your email</Text>

              <View style={ST.field}>
                <Text style={ST.label}>Reset Token</Text>
                <View style={ST.inputWrap}>
                  <TextInput
                    style={ST.input}
                    value={resetToken}
                    onChangeText={setResetToken}
                    placeholder="Paste your reset token here"
                    placeholderTextColor={C.muted}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
                <Text style={ST.hintText}>💡 Check the backend console for the token in development mode</Text>
              </View>

              <TouchableOpacity style={[ST.btn, (!resetToken.trim() || loading) && ST.btnOff]} onPress={handleContinue} disabled={!resetToken.trim() || loading} activeOpacity={0.85}>
                <Text style={ST.btnText}>CONTINUE TO RESET</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={ST.linkBtn} onPress={() => navigation.navigate('Login')} disabled={loading}>
            <Text style={ST.linkText}>Remember your password? Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const ST = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingTop: 48, paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 16, paddingVertical: 8, paddingHorizontal: 12 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: C.navy },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  iconText: { fontSize: 32 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: C.navy, marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },

  form: { flex: 1, backgroundColor: C.card, borderRadius: 20, padding: 24, marginHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  formTitle: { fontSize: 22, fontWeight: '800', color: C.navy, marginBottom: 4 },
  formLine: { width: 36, height: 3, borderRadius: 2, backgroundColor: C.accent, marginBottom: 8 },
  formSub: { fontSize: 13, color: C.muted, marginBottom: 20 },

  field: { marginBottom: 14 },
  label: { fontSize: 10, fontWeight: '800', color: C.navy, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  inputWrap: { borderWidth: 1.5, borderColor: C.navy + '15', borderRadius: 12, backgroundColor: C.white },
  inputErr: { borderColor: C.red },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.navy },
  errText: { fontSize: 11, color: C.red, marginTop: 4, marginLeft: 4 },
  hintText: { fontSize: 11, color: C.accent, marginTop: 6, fontStyle: 'italic' },

  btn: { backgroundColor: C.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  btnOff: { opacity: 0.6 },
  btnText: { fontSize: 14, fontWeight: '800', color: C.white, letterSpacing: 2 },

  linkBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 13, fontWeight: '600', color: C.accent },
});