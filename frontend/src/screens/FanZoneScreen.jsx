// frontend/src/screens/FanZoneScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../components/common/NavBar';
import Notification from '../components/common/Notification';
import { authStorage } from '../utils/authStorage';
import { API_BASE_URL } from '../constants/config';
import { pollsApi, commentsApi, membershipsApi } from '../services/apiService';

const C = { card: 'rgba(255,255,255,0.9)', accent: '#2E86C1', navy: '#1B4F72', secText: '#5D6D7E', muted: '#85929E', green: '#27AE60', red: '#E74C3C', white: '#FFFFFF' };
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

export default function FanZoneScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);

  /* ── Poll ─ */
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [pollResults, setPollResults] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  /* ── Comments ── */
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentErrors, setCommentErrors] = useState({ name: '', text: '' });
  const [commentTouched, setCommentTouched] = useState({ name: false, text: false });

  /* ── Membership ─ */
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [membershipFee, setMembershipFee] = useState(50);
  const [submittingMembership, setSubmittingMembership] = useState(false);
  const [memberErrors, setMemberErrors] = useState({ name: '', email: '', phone: '' });
  const [memberTouched, setMemberTouched] = useState({ name: false, email: false, phone: false });

  const [notification, setNotification] = useState({ message: '', type: 'info', visible: false });
  const showNotif = (msg, type = 'success') => setNotification({ message: msg, type, visible: true });
  const hideNotif = () => setNotification(p => ({ ...p, visible: false }));

  const validateEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validatePhone = v => /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}$/.test(v.trim());

  useEffect(() => {
    (async () => {
      try {
        const u = await authStorage.getUser();
        if (u) {
          setUser(u);
          setMemberName(u.full_name || '');
          setMemberEmail(u.email || '');
          setMemberPhone(u.phone || '');
          setCommentName(u.full_name || '');
        }
      } catch {}
    })();
  }, []);

  useEffect(() => { loadComments(); loadMembershipFee(); loadActivePoll(); }, []);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try { const d = await commentsApi.getAll(); if (d.success) setComments(Array.isArray(d.data) ? d.data : []); } catch { setComments([]); }
    finally { setLoadingComments(false); }
  }, []);

  const loadMembershipFee = useCallback(async () => {
    try { const r = await fetch(`${API_BASE_URL}/settings/membership-fee`); if (!r.ok) return; const d = await r.json(); if (d.success && d.data?.membership_fee !== undefined) setMembershipFee(Number(d.data.membership_fee) || 50); } catch {}
  }, []);

  const loadActivePoll = useCallback(async () => {
    try { const d = await pollsApi.getActive(); if (d.success && d.data) { setActivePoll(d.data); loadPollResults(d.data.pollID); } } catch {}
  }, []);

  const loadPollResults = useCallback(async id => { if (!id) return; try { const d = await pollsApi.getResults(id); if (d.success) setPollResults(Array.isArray(d.data) ? d.data : []); } catch {} }, []);

  const submitPoll = useCallback(async () => {
    if (!selectedPlayer) { showNotif('Please select an option', 'error'); return; }
    if (hasVoted) { showNotif('You have already voted!', 'warning'); return; }
    setSubmittingVote(true);
    try {
      if (activePoll?.pollID) {
        const d = await pollsApi.vote(activePoll.pollID, parseInt(selectedPlayer, 10));
        if (d.success) {
          await loadPollResults(activePoll.pollID);
          const player = activePoll?.players?.find(p => p.playerID.toString() === selectedPlayer);
          setHasVoted(true);
          showNotif(`Vote cast for ${player?.name || 'your choice'}!`);
          setSelectedPlayer('');
        } else showNotif(d.message || 'Failed to cast vote', 'error');
      }
    } catch (err) { showNotif(err.message || 'Failed to cast vote', 'error'); }
    finally { setSubmittingVote(false); }
  }, [selectedPlayer, hasVoted, activePoll, loadPollResults]);

  const submitComment = useCallback(async () => {
    setCommentTouched({ name: true, text: true });
    const errs = { name: '', text: '' };
    if (!commentName.trim() || commentName.trim().length < 2) errs.name = 'Name required (min 2 chars)';
    if (!commentText.trim() || commentText.trim().length < 5) errs.text = 'Min 5 characters';
    setCommentErrors(errs);
    if (errs.name || errs.text) { showNotif('Please fix the errors', 'error'); return; }
    setSubmittingComment(true);
    try { const d = await commentsApi.create({ commenter_name: commentName.trim(), comment_text: commentText.trim() }); if (d.success) { await loadComments(); showNotif('Comment posted!'); setCommentText(''); setCommentTouched({ name: false, text: false }); setCommentErrors({ name: '', text: '' }); } else showNotif(d.message || 'Failed', 'error'); }
    catch (err) { showNotif(err.message || 'Failed', 'error'); }
    finally { setSubmittingComment(false); }
  }, [commentName, commentText, loadComments]);

  const submitMembership = useCallback(async () => {
    setMemberTouched({ name: true, email: true, phone: true });
    const errs = { name: '', email: '', phone: '' };
    if (!memberName.trim() || memberName.trim().length < 2) errs.name = 'Name required';
    if (!memberEmail.trim() || !validateEmail(memberEmail)) errs.email = 'Invalid email';
    if (!memberPhone.trim() || !validatePhone(memberPhone)) errs.phone = 'Invalid phone';
    setMemberErrors(errs);
    if (errs.name || errs.email || errs.phone) { showNotif('Please fix the errors', 'error'); return; }
    setSubmittingMembership(true);
    try { const d = await membershipsApi.create({ full_name: memberName.trim(), email: memberEmail.trim().toLowerCase(), phone: memberPhone.trim(), membership_fee: membershipFee, join_date: new Date().toISOString().split('T')[0], expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0] }); if (d.success) { showNotif('Welcome to The Wolves family!'); setMemberTouched({ name: false, email: false, phone: false }); setMemberErrors({ name: '', email: '', phone: '' }); } else showNotif(d.message || 'Failed', 'error'); }
    catch (err) { showNotif(err.message || 'Failed', 'error'); }
    finally { setSubmittingMembership(false); }
  }, [memberName, memberEmail, memberPhone, membershipFee]);

  const formatDate = d => !d ? '' : new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const renderPollResults = () => {
    if (pollResults.length === 0 && !hasVoted) return null;
    const results = pollResults.length > 0 ? pollResults : (activePoll?.players || []).map(p => ({ player_name: p.name, vote_count: 0, playerID: p.playerID }));
    const total = results.reduce((s, r) => s + Number(r.vote_count || 0), 0);
    const filtered = results.filter(r => Number(r.vote_count || 0) > 0);
    if (filtered.length === 0) return null;
    return (
      <View style={ST.pollResults}>
        <View style={ST.pollResultsHead}><Text style={ST.pollResultsTitle}>YOUR SELECTION</Text><Text style={ST.pollResultsCount}>{total} total votes</Text></View>
        {filtered.map((r, i) => {
          const pct = total > 0 ? Math.round((Number(r.vote_count) / total) * 100) : 0;
          return (
            <View key={i} style={ST.pollRow}>
              <View style={ST.pollRowLabels}><Text style={ST.pollName}>{r.player_name || r.name}</Text><Text style={ST.pollPct}>{r.vote_count} votes · {pct}%</Text></View>
              <View style={ST.pollTrack}><View style={ST.pollFill} /></View>
              <Text style={ST.pollPctBar}>{pct}%</Text>
            </View>
          );
        })}
        {total === 0 && <Text style={ST.emptyText}>No votes cast yet.</Text>}
      </View>
    );
  };

  const InputField = ({ label, value, onChangeText, error, touched, placeholder, ...props }) => (
    <View style={ST.field}>
      <Text style={ST.fieldLabel}>{label}</Text>
      <View style={[ST.inputWrap, error && touched && ST.inputErr]}>
        <TextInput style={ST.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} editable={!submittingMembership} {...props} />
      </View>
      {error && touched ? <Text style={ST.errText}>{error}</Text> : null}
    </View>
  );

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Notification message={notification.message} type={notification.type} visible={notification.visible} onHide={hideNotif} />
      <NavBar navigation={navigation} activeScreen="FanZone" onLogout={onLogout} />
      <ScrollView style={ST.scroll} refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} tintColor={C.accent} />}>
        <View style={ST.body}>
          <Text style={ST.pageTitle}>Fan Zone</Text>

          {/* ── Poll ─ */}
          <Section title={activePoll ? (activePoll.is_active ? 'Vote Now' : 'Poll Results') : 'Poll'}>
            {!activePoll ? <Text style={ST.emptyText}>No active poll. Check back later!</Text> : activePoll.players?.length > 0 ? (
              <>
                <Text style={ST.pollQ}>{activePoll.question}</Text>
                <Text style={ST.pollMeta}>by {activePoll.admin_name || 'Admin'} · {activePoll.players?.length || 0} options</Text>
                <View style={ST.pickerWrap}><Picker selectedValue={selectedPlayer} onValueChange={setSelectedPlayer} style={ST.picker} enabled={!hasVoted && activePoll.is_active}><Picker.Item label="Select an option..." value="" color={C.navy} />{activePoll.players.map(p => <Picker.Item key={p.playerID} label={`${p.name} (#${p.jersey_number})`} value={p.playerID.toString()} color={C.navy} />)}</Picker></View>
                {activePoll.is_active && <TouchableOpacity style={[ST.btn, (submittingVote || hasVoted) && ST.btnOff]} onPress={submitPoll} disabled={submittingVote || hasVoted}>{submittingVote ? <ActivityIndicator color={C.white} size="small" /> : <Text style={ST.btnText}>{hasVoted ? 'VOTED' : 'CAST VOTE'}</Text>}</TouchableOpacity>}
                {renderPollResults()}
              </>
            ) : <Text style={ST.emptyText}>No options available</Text>}
          </Section>

          {/* ── Comments ─ */}
          <Section title="Fan Comments">
            <InputField label="Your Name" value={commentName} onChangeText={v => { setCommentName(v); if (commentTouched.name) { const e = !v.trim() || v.trim().length < 2 ? 'Name required (min 2 chars)' : ''; setCommentErrors(p => ({ ...p, name: e })); } }} error={commentErrors.name} touched={commentTouched.name} placeholder="Your name" />
            <View style={ST.field}>
              <Text style={ST.fieldLabel}>Comment</Text>
              <View style={[ST.inputWrap, commentErrors.text && commentTouched.text && ST.inputErr]}>
                <TextInput style={[ST.input, ST.textarea]} value={commentText} onChangeText={v => { setCommentText(v); if (commentTouched.text) { const e = !v.trim() || v.trim().length < 5 ? 'Min 5 characters' : ''; setCommentErrors(p => ({ ...p, text: e })); } }} placeholder="Share your thoughts..." placeholderTextColor={C.muted} multiline numberOfLines={4} textAlignVertical="top" />
              </View>
              {commentErrors.text && commentTouched.text ? <Text style={ST.errText}>{commentErrors.text}</Text> : null}
            </View>
            <TouchableOpacity style={[ST.btn, submittingComment && ST.btnOff]} onPress={submitComment} disabled={submittingComment}>{submittingComment ? <ActivityIndicator color={C.white} size="small" /> : <Text style={ST.btnText}>POST COMMENT</Text>}</TouchableOpacity>
            <View style={ST.commentsList}>
              {loadingComments ? <Loader /> : comments.length > 0 ? comments.map(c => (
                <View key={c.commentID} style={ST.commentItem}>
                  <View style={ST.commentHead}><Text style={ST.commentName}>{c.commenter_name || c.name || 'Anonymous'}</Text><Text style={ST.commentDate}>{formatDate(c.created_at || c.date)}</Text></View>
                  <Text style={ST.commentText}>{c.comment_text || c.text || ''}</Text>
                </View>
              )) : <Text style={ST.emptyText}>No comments yet. Be the first!</Text>}
            </View>
          </Section>

          {/* ── Membership (prefilled) ── */}
          <Section title="Join The Wolves">
            <Text style={ST.prefillNote}>Fields are prefilled from your account. Update if needed.</Text>
            <View style={ST.feeRow}><Text style={ST.feeLabel}>Annual Membership</Text><Text style={ST.feeAmt}>KES {membershipFee}</Text></View>
            <InputField label="Full Name" value={memberName} onChangeText={v => { setMemberName(v); if (memberTouched.name) { const e = !v.trim() || v.trim().length < 2 ? 'Name required' : ''; setMemberErrors(p => ({ ...p, name: e })); } }} error={memberErrors.name} touched={memberTouched.name} placeholder="Your full name" />
            <InputField label="Email Address" value={memberEmail} onChangeText={v => { setMemberEmail(v); if (memberTouched.email) { const e = !v.trim() || !validateEmail(v) ? 'Invalid email' : ''; setMemberErrors(p => ({ ...p, email: e })); } }} error={memberErrors.email} touched={memberTouched.email} placeholder="Your email" keyboardType="email-address" autoCapitalize="none" />
            <InputField label="Phone Number" value={memberPhone} onChangeText={v => { setMemberPhone(v); if (memberTouched.phone) { const e = !v.trim() || !validatePhone(v) ? 'Invalid phone' : ''; setMemberErrors(p => ({ ...p, phone: e })); } }} error={memberErrors.phone} touched={memberTouched.phone} placeholder="Your phone" keyboardType="phone-pad" />
            <TouchableOpacity style={[ST.btn, submittingMembership && ST.btnOff]} onPress={submitMembership} disabled={submittingMembership}>{submittingMembership ? <ActivityIndicator color={C.white} size="small" /> : <Text style={ST.btnText}>REGISTER</Text>}</TouchableOpacity>
          </Section>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function Section({ title, children }) { return <View style={ST.section}><View style={ST.secHead}><Text style={ST.secTitle}>{title}</Text><View style={ST.secLine} /></View>{children}</View>; }
function Loader() { return <ActivityIndicator color={C.accent} style={{ padding: 16 }} />; }

const ST = StyleSheet.create({
  root: { flex: 1 }, scroll: { flex: 1 }, body: { padding: 16, paddingTop: 8 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 14 },
  section: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  secTitle: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
  secLine: { flex: 1, height: 1, backgroundColor: C.navy + '15' },
  pollQ: { fontSize: 14, fontWeight: '700', color: C.navy, marginBottom: 4, lineHeight: 20 },
  pollMeta: { fontSize: 11, color: C.muted, marginBottom: 12 },
  pickerWrap: { borderWidth: 1.5, borderColor: C.navy + '15', borderRadius: 12, backgroundColor: C.white, overflow: 'hidden', marginBottom: 12 },
  picker: { color: C.navy, backgroundColor: C.white },
  btn: { backgroundColor: C.accent, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 4, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  btnOff: { opacity: 0.6 },
  btnText: { fontSize: 12, fontWeight: '800', color: C.white, letterSpacing: 1.5 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: C.navy, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  inputWrap: { borderWidth: 1.5, borderColor: C.navy + '15', borderRadius: 12, backgroundColor: C.white },
  inputErr: { borderColor: C.red },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.navy },
  textarea: { height: 90, paddingTop: 12 },
  errText: { fontSize: 11, color: C.red, marginTop: 4, marginLeft: 4 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 8 },
  prefillNote: { fontSize: 12, color: C.muted, fontStyle: 'italic', marginBottom: 12 },

  pollResults: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.navy + '15' },
  pollResultsHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pollResultsTitle: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 1.5 },
  pollResultsCount: { fontSize: 11, color: C.muted },
  pollRow: { marginBottom: 12 },
  pollRowLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  pollName: { fontSize: 13, fontWeight: '700', color: C.navy },
  pollPct: { fontSize: 12, color: C.muted },
  pollTrack: { height: 10, backgroundColor: C.navy + '10', borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
  pollFill: { height: 10, backgroundColor: C.accent, borderRadius: 5, width: '100%' },
  pollPctBar: { fontSize: 11, color: C.accent, fontWeight: '700', textAlign: 'right' },

  commentsList: { marginTop: 14, gap: 8 },
  commentItem: { backgroundColor: C.white, borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: C.accent },
  commentHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentName: { fontSize: 12, fontWeight: '800', color: C.navy },
  commentDate: { fontSize: 10, color: C.muted },
  commentText: { fontSize: 13, color: C.secText, lineHeight: 20 },

  feeRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.navy + '08', borderRadius: 12, padding: 14, marginBottom: 14 },
  feeLabel: { fontSize: 12, color: C.secText },
  feeAmt: { fontSize: 20, fontWeight: '900', color: C.navy },
});