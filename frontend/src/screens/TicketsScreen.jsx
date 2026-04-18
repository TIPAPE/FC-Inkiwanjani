// frontend/src/screens/TicketsScreen.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Animated, ActivityIndicator, StatusBar } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../components/common/NavBar';
import { authStorage } from '../utils/authStorage';
import { API_BASE_URL, APP_NAME } from '../constants/config';

const C = { card: 'rgba(255,255,255,0.9)', accent: '#2E86C1', navy: '#1B4F72', secText: '#5D6D7E', muted: '#85929E', green: '#27AE60', red: '#E74C3C', white: '#FFFFFF' };
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

export default function TicketsScreen({ navigation, route, onLogout }) {
  const { matchId: routeMatchId } = route?.params || {};
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [matches, setMatches] = useState([]);
  const [ticketPrices, setTicketPrices] = useState({ vip: 20, regular: 10, student: 5 });
  const [bookings, setBookings] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [ticketType, setTicketType] = useState('');
  const [ticketQuantity, setTicketQuantity] = useState('1');
  const [totalPrice, setTotalPrice] = useState(0);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validateEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validatePhone = v => /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}$/.test(v.trim());

  const validateField = (field, value) => {
    let err = '';
    switch (field) {
      case 'customerName': if (!value.trim()) err = 'Required'; else if (value.trim().length < 2) err = 'Min 2 chars'; break;
      case 'customerEmail': if (!value.trim()) err = 'Required'; else if (!validateEmail(value)) err = 'Invalid email'; break;
      case 'customerPhone': if (!value.trim()) err = 'Required'; else if (!validatePhone(value)) err = 'Invalid phone'; break;
      case 'ticketType': if (!value) err = 'Select a type'; break;
      case 'ticketQuantity': { const q = parseInt(value, 10); if (!value || isNaN(q) || q < 1) err = 'Invalid'; else if (q > 100) err = 'Max 100'; break; }
      case 'selectedMatch': if (!value) err = 'Select a match'; break;
      default: break;
    }
    setFormErrors(p => ({ ...p, [field]: err }));
  };

  const handleFieldChange = (field, value) => {
    const setters = { customerName: setCustomerName, customerEmail: setCustomerEmail, customerPhone: setCustomerPhone, ticketType: setTicketType, ticketQuantity: setTicketQuantity, selectedMatch: setSelectedMatch };
    setters[field]?.(value);
    if (touchedFields[field]) validateField(field, value);
  };

  const handleFieldBlur = (field, value) => { setTouchedFields(p => ({ ...p, [field]: true })); validateField(field, value); };

  const loadAuth = useCallback(async () => {
    try { const t = await authStorage.getToken(); const u = await authStorage.getUser(); if (t && u) { setToken(t); setUser(u); setCustomerName(u.full_name || ''); setCustomerEmail(u.email || ''); } } catch {}
  }, []);

  const loadMatches = useCallback(async () => {
    setLoadingMatches(true);
    try { const r = await fetch(`${API_BASE_URL}/matches/upcoming`); if (!r.ok) throw new Error(); const d = await r.json(); if (d.success) setMatches(Array.isArray(d.data) ? d.data : []); } catch { Alert.alert('Error', 'Failed to load matches.'); }
    finally { setLoadingMatches(false); }
  }, []);

  const loadTicketPrices = useCallback(async () => {
    setLoadingPrices(true);
    try { const r = await fetch(`${API_BASE_URL}/settings/ticket-prices`); if (!r.ok) throw new Error(); const d = await r.json(); if (d.success && d.data) setTicketPrices({ vip: Number(d.data.vip) || 20, regular: Number(d.data.regular) || 10, student: Number(d.data.student) || 5 }); } catch {}
    finally { setLoadingPrices(false); }
  }, []);

  const loadUserBookings = useCallback(async (emailOverride) => {
    const email = emailOverride || user?.email; if (!email) return;
    setLoadingBookings(true);
    try { const r = await fetch(`${API_BASE_URL}/bookings?email=${encodeURIComponent(email.toLowerCase())}`); if (!r.ok) throw new Error(); const d = await r.json(); if (d.success) setBookings(Array.isArray(d.data) ? d.data : []); } catch {}
    finally { setLoadingBookings(false); }
  }, [user?.email]);

  useEffect(() => { (async () => { await loadAuth(); await Promise.all([loadMatches(), loadTicketPrices()]); })(); }, []);
  useEffect(() => { if (user?.email) loadUserBookings(user.email); }, [user]);
  useEffect(() => { if (routeMatchId && matches.length > 0) { setSelectedMatch(routeMatchId.toString()); setShowBookingForm(true); } }, [routeMatchId, matches]);
  useEffect(() => { const q = parseInt(ticketQuantity, 10) || 0; const p = ticketType ? (ticketPrices[ticketType] || 0) : 0; setTotalPrice(p * q); }, [ticketType, ticketQuantity, ticketPrices]);

  const displayNotification = useCallback(msg => {
    setNotificationMessage(msg); setShowNotification(true); notificationAnim.setValue(-100);
    Animated.sequence([Animated.timing(notificationAnim, { toValue: 20, duration: 300, useNativeDriver: true }), Animated.delay(2700), Animated.timing(notificationAnim, { toValue: -100, duration: 300, useNativeDriver: true })]).start(() => setShowNotification(false));
  }, [notificationAnim]);

  const submitBooking = async () => {
    const fields = ['customerName', 'customerEmail', 'customerPhone', 'ticketType', 'ticketQuantity', 'selectedMatch'];
    const vals = { customerName, customerEmail, customerPhone, ticketType, ticketQuantity, selectedMatch };
    setTouchedFields(Object.fromEntries(fields.map(f => [f, true])));
    fields.forEach(f => validateField(f, vals[f]));
    if (Object.values(formErrors).some(e => e) || !customerName.trim() || !customerEmail.trim() || !customerPhone.trim() || !ticketType || !selectedMatch) { Alert.alert('Validation Error', 'Please fix the errors.'); return; }
    setSubmitting(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const r = await fetch(`${API_BASE_URL}/bookings`, { method: 'POST', headers, body: JSON.stringify({ matchID: parseInt(selectedMatch, 10), customer_name: customerName.trim(), customer_email: customerEmail.trim().toLowerCase(), customer_phone: customerPhone.trim(), ticket_type: ticketType, quantity: parseInt(ticketQuantity, 10), total_amount: totalPrice }) });
      const d = await r.json();
      if (d.success) { displayNotification(`Booking confirmed. Ref: ${d.data.booking_reference}`); setCustomerPhone(''); setTicketType(''); setTicketQuantity('1'); setSelectedMatch(''); setShowBookingForm(false); setTotalPrice(0); await loadUserBookings(customerEmail.trim().toLowerCase()); }
      else Alert.alert('Booking Failed', d.message || 'Failed.');
    } catch { Alert.alert('Error', 'Failed to submit booking.'); }
    finally { setSubmitting(false); }
  };

  const formatDate = d => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
  const formatDateTime = d => d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBA';
  const getMatchLabel = m => `${formatDate(m.match_date)} — ${APP_NAME} ${m.venue === 'home' ? `vs ${m.opponent} (H)` : `at ${m.opponent} (A)`}`;
  const payColor = s => s === 'paid' ? C.green : s === 'cancelled' ? C.red : '#F39C12';

  const InputField = ({ label, field, placeholder, ...props }) => (
    <View style={ST.field}>
      <Text style={ST.fieldLabel}>{label}</Text>
      <View style={[ST.inputWrap, formErrors[field] && touchedFields[field] && ST.inputErr]}>
        <TextInput style={ST.input} value={field === 'customerName' ? customerName : field === 'customerEmail' ? customerEmail : field === 'customerPhone' ? customerPhone : ticketQuantity} onChangeText={v => handleFieldChange(field, v)} onBlur={() => handleFieldBlur(field, field === 'customerName' ? customerName : field === 'customerEmail' ? customerEmail : field === 'customerPhone' ? customerPhone : ticketQuantity)} placeholder={placeholder} placeholderTextColor={C.muted} editable={!submitting} {...props} />
      </View>
      {formErrors[field] && touchedFields[field] ? <Text style={ST.errText}>{formErrors[field]}</Text> : null}
    </View>
  );

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NavBar navigation={navigation} activeScreen="Tickets" isAdmin={user?.isAdmin} onLogout={onLogout} />
      <ScrollView style={ST.scroll}>
        <View style={ST.body}>
          <Text style={ST.pageTitle}>Book Tickets</Text>

          <Section title="Select a Match">
            {loadingMatches ? <Loader /> : matches.length > 0 ? (
              <View style={ST.pickerWrap}><Picker selectedValue={selectedMatch} onValueChange={v => { setSelectedMatch(v); setShowBookingForm(v !== ''); }} style={ST.picker}><Picker.Item label="Select a match..." value="" color={C.navy} />{matches.map(m => <Picker.Item key={m.matchID} label={getMatchLabel(m)} value={m.matchID.toString()} color={C.navy} />)}</Picker></View>
            ) : <Text style={ST.emptyText}>No upcoming matches</Text>}
          </Section>

          {!loadingPrices && (
            <Section title="Ticket Prices">
              <View style={ST.priceRow}>
                <PricePill label="VIP" value={ticketPrices.vip} />
                <PricePill label="Regular" value={ticketPrices.regular} />
                <PricePill label="Student" value={ticketPrices.student} />
              </View>
            </Section>
          )}

          {showBookingForm && (
            <Section title="Booking Details">
              <InputField label="Full Name" field="customerName" placeholder="Enter your full name" />
              <InputField label="Email Address" field="customerEmail" placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" />
              <InputField label="Phone Number" field="customerPhone" placeholder="+254712345678" keyboardType="phone-pad" />
              <View style={ST.field}>
                <Text style={ST.fieldLabel}>Ticket Type</Text>
                <View style={[ST.pickerWrap, formErrors.ticketType && touchedFields.ticketType && ST.inputErr]}>
                  <Picker selectedValue={ticketType} onValueChange={v => handleFieldChange('ticketType', v)} style={ST.picker}>
                    <Picker.Item label="Select type..." value="" color={C.navy} />
                    <Picker.Item label={`VIP — KES ${ticketPrices.vip}`} value="vip" color={C.navy} />
                    <Picker.Item label={`Regular — KES ${ticketPrices.regular}`} value="regular" color={C.navy} />
                    <Picker.Item label={`Student — KES ${ticketPrices.student}`} value="student" color={C.navy} />
                  </Picker>
                </View>
                {formErrors.ticketType && touchedFields.ticketType ? <Text style={ST.errText}>{formErrors.ticketType}</Text> : null}
              </View>
              <InputField label="Number of Tickets" field="ticketQuantity" placeholder="1" keyboardType="number-pad" />
              <View style={ST.totalRow}><Text style={ST.totalLabel}>Total</Text><Text style={ST.totalVal}>KES {totalPrice}</Text></View>
              <TouchableOpacity style={[ST.btn, submitting && ST.btnOff]} onPress={submitBooking} disabled={submitting} activeOpacity={0.85}>
                {submitting ? <ActivityIndicator color={C.white} size="small" /> : <Text style={ST.btnText}>CONFIRM BOOKING</Text>}
              </TouchableOpacity>
            </Section>
          )}

          <Section title="My Bookings">
            {loadingBookings ? <Loader /> : bookings.length > 0 ? bookings.map(b => (
              <View key={b.bookingID} style={ST.bookingCard}>
                <View style={ST.bookingHead}><Text style={ST.bookingRef}>{b.booking_reference || `Booking #${b.bookingID}`}</Text><View style={[ST.payBadge, { backgroundColor: payColor(b.payment_status) }]}><Text style={ST.payBadgeText}>{b.payment_status?.toUpperCase()}</Text></View></View>
                <Text style={ST.bookingMatch}>{APP_NAME} vs {b.opponent || `Match #${b.matchID}`}</Text>
                {b.match_date && <Text style={ST.bookingMeta}>{formatDateTime(b.match_date)}</Text>}
                <Text style={ST.bookingMeta}>{b.customer_name} · {b.customer_email}</Text>
                <View style={ST.bookingFoot}><Text style={ST.bookingMeta}>{b.quantity}× {b.ticket_type?.toUpperCase()}</Text><Text style={ST.bookingAmt}>KES {parseFloat(b.total_amount).toFixed(2)}</Text></View>
                <Text style={ST.bookingDate}>Booked {formatDate(b.booking_date)}</Text>
              </View>
            )) : <Text style={ST.emptyText}>No bookings yet</Text>}
          </Section>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
      {showNotification && <Animated.View style={[ST.notif, { transform: [{ translateY: notificationAnim }] }]}><Text style={ST.notifText}>{notificationMessage}</Text></Animated.View>}
    </LinearGradient>
  );
}

function Section({ title, children }) { return <View style={ST.section}><View style={ST.secHead}><Text style={ST.secTitle}>{title}</Text><View style={ST.secLine} /></View>{children}</View>; }
function PricePill({ label, value }) { return <View style={ST.pricePill}><Text style={ST.pricePillVal}>KES {value}</Text><Text style={ST.pricePillLbl}>{label}</Text></View>; }
function Loader() { return <ActivityIndicator color={C.accent} style={{ padding: 16 }} />; }

const ST = StyleSheet.create({
  root: { flex: 1 }, scroll: { flex: 1 }, body: { padding: 16, paddingTop: 8 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 14 },
  section: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  secTitle: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
  secLine: { flex: 1, height: 1, backgroundColor: C.navy + '15' },
  pickerWrap: { borderWidth: 1.5, borderColor: C.navy + '15', borderRadius: 12, backgroundColor: C.white, overflow: 'hidden' },
  picker: { color: C.navy, backgroundColor: C.white },
  priceRow: { flexDirection: 'row', gap: 10 },
  pricePill: { flex: 1, backgroundColor: C.navy + '08', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  pricePillVal: { fontSize: 18, fontWeight: '900', color: C.navy },
  pricePillLbl: { fontSize: 10, color: C.muted, marginTop: 2 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: C.navy, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  inputWrap: { borderWidth: 1.5, borderColor: C.navy + '15', borderRadius: 12, backgroundColor: C.white },
  inputErr: { borderColor: C.red },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.navy },
  errText: { fontSize: 11, color: C.red, marginTop: 4, marginLeft: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 14 },
  totalLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  totalVal: { fontSize: 20, fontWeight: '900', color: C.white },
  btn: { backgroundColor: C.accent, paddingVertical: 13, borderRadius: 12, alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  btnOff: { opacity: 0.6 },
  btnText: { fontSize: 13, fontWeight: '800', color: C.white, letterSpacing: 1.5 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 8 },
  bookingCard: { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: C.accent },
  bookingHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bookingRef: { fontSize: 13, fontWeight: '700', color: C.navy, flex: 1 },
  payBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  payBadgeText: { fontSize: 9, fontWeight: '800', color: C.white },
  bookingMatch: { fontSize: 14, fontWeight: '700', color: C.navy, marginBottom: 4 },
  bookingMeta: { fontSize: 12, color: C.secText, marginBottom: 2 },
  bookingFoot: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: C.navy + '10', marginTop: 6 },
  bookingAmt: { fontSize: 16, fontWeight: '800', color: C.navy },
  bookingDate: { fontSize: 10, color: C.muted, marginTop: 4 },
  notif: { position: 'absolute', top: 70, right: 16, left: 16, backgroundColor: C.navy, padding: 14, borderRadius: 12, elevation: 6, zIndex: 3000, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  notifText: { fontSize: 13, fontWeight: '700', color: C.white },
});