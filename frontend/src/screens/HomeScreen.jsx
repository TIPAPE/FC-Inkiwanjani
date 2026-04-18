// frontend/src/screens/HomeScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, Modal, ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../components/common/NavBar';
import { authStorage } from '../utils/authStorage';
import { API_BASE_URL, DEFAULT_TIMEOUT, APP_NAME, CLUB_NICKNAME } from '../constants/config';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const NUM_COLUMNS = 3;                          // ← Changed from 2 to 3
const CARD_WIDTH = (width - 32 - (NUM_COLUMNS - 1) * CARD_GAP) / NUM_COLUMNS;

function withTimeout(ms, controller) {
  const id = setTimeout(() => controller.abort(), ms);
  return () => clearTimeout(id);
}

async function safeJson(response) {
  const responseText = await response.text();
  try { return JSON.parse(responseText); } catch { return { success: false, message: 'Invalid JSON' }; }
}

/* Colour palette */
const C = {
  primary: '#2E86C1',
  primaryDark: '#1B4F72',
  white: '#FFFFFF',
  lightBg: '#F5F9FC',
  cardBg: '#FFFFFF',
  textDark: '#1A2A3A',
  textSecondary: '#5D6D7E',
  textMuted: '#85929E',
  green: '#27AE60',
  red: '#E74C3C',
  border: '#E2E8F0',
};

const BG = ['#FFFFFF', '#E8F4FD'];

export default function HomeScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [countdown, setCountdown] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [newsArticles, setNewsArticles] = useState([]);
  const [nextMatch, setNextMatch] = useState(null);
  const [lastMatch, setLastMatch] = useState(null);
  const [topScorer, setTopScorer] = useState(null);
  const [teamStats, setTeamStats] = useState({ wins: 0, draws: 0, losses: 0, played: 0, points: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const mountedRef = useRef(true);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.isAdmin === true || user.type === 'admin') return true;
    if (typeof user.role === 'string' && ['super_admin', 'admin', 'editor'].includes(user.role)) return true;
    return false;
  }, [user]);

  const apiFetch = useCallback(async (path, options = {}) => {
    const controller = new AbortController();
    const clear = withTimeout(DEFAULT_TIMEOUT || 10000, controller);
    try {
      const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
      const res = await fetch(url, { ...options, signal: controller.signal, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) } });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
      return json;
    } finally { clear(); }
  }, []);

  useEffect(() => {
    (async () => { try { const u = await authStorage.getUser(); if (u) setUser(u); } catch {} setAuthChecking(false); })();
  }, []);

  const calculateTeamStats = useCallback((matches) => {
    let w = 0, d = 0, l = 0;
    (matches || []).forEach((m) => {
      const ours = m.venue === 'home' ? Number(m.home_score) : Number(m.away_score);
      const theirs = m.venue === 'home' ? Number(m.away_score) : Number(m.home_score);
      if (!Number.isFinite(ours) || !Number.isFinite(theirs)) return;
      if (ours > theirs) w++;
      else if (ours === theirs) d++;
      else l++;
    });
    setTeamStats({ wins: w, draws: d, losses: l, played: (matches || []).length, points: w * 3 + d });
  }, []);

  const loadHomeData = useCallback(async () => {
    setErrorBanner('');
    const [news, next, last, done, scorers] = await Promise.allSettled([
      apiFetch('/news/latest?limit=6'),
      apiFetch('/matches/next'),
      apiFetch('/matches/last'),
      apiFetch('/matches/completed?limit=50'),
      apiFetch('/players/top/scorers?limit=1'),
    ]);
    if (!mountedRef.current) return;
    setNewsArticles(news.status === 'fulfilled' && news.value?.success ? (Array.isArray(news.value.data) ? news.value.data : []) : []);
    setNextMatch(next.status === 'fulfilled' && next.value?.success ? next.value.data || null : null);
    setLastMatch(last.status === 'fulfilled' && last.value?.success ? last.value.data || null : null);
    if (done.status === 'fulfilled' && done.value?.success) calculateTeamStats(Array.isArray(done.value.data) ? done.value.data : []);
    else calculateTeamStats([]);
    setTopScorer(scorers.status === 'fulfilled' && scorers.value?.success && Array.isArray(scorers.value.data) && scorers.value.data.length ? scorers.value.data[0] : null);
    setLoading(false);
    setRefreshing(false);
  }, [apiFetch, calculateTeamStats]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { loadHomeData(); }, [loadHomeData]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadHomeData(); }, [loadHomeData]);

  /* Countdown */
  useEffect(() => {
    if (!nextMatch?.match_date) { setCountdown(''); return; }
    const tick = () => {
      const diff = new Date(nextMatch.match_date).getTime() - Date.now();
      if (!Number.isFinite(diff)) { setCountdown(''); return; }
      if (diff <= 0) { setCountdown('Kickoff!'); return; }
      const dd = Math.floor(diff / 86400000), hh = Math.floor((diff % 86400000) / 3600000), mm = Math.floor((diff % 3600000) / 60000), ss = Math.floor((diff % 60000) / 1000);
      setCountdown(`${dd}d ${hh}h ${mm}m ${ss}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextMatch]);

  const formatDate = useCallback((d) => {
    if (!d) return '';
    const n = /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d;
    const dt = new Date(n);
    return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);

  const formatDateTime = useCallback((d) => {
    if (!d) return '';
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  const lastResult = useMemo(() => {
    if (!lastMatch) return null;
    const hs = lastMatch.home_score ?? '-', as = lastMatch.away_score ?? '-';
    return lastMatch.venue === 'home' ? { lt: APP_NAME, ls: hs, rs: as, rt: lastMatch.opponent } : { lt: lastMatch.opponent, ls: hs, rs: as, rt: APP_NAME };
  }, [lastMatch]);

  const showNewsModal = useCallback((a) => { setSelectedArticle(a); setModalVisible(true); }, []);
  const closeModal = useCallback(() => { setModalVisible(false); setSelectedArticle(null); }, []);

  if (authChecking) {
    return (
      <LinearGradient colors={BG} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={ST.logoCircle}><Text style={ST.logoCircleText}>W</Text></View>
        <Text style={{ marginTop: 14, color: C.textMuted, fontSize: 14 }}>Loading…</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NavBar navigation={navigation} activeScreen="Home" isAdmin={isAdmin} onLogout={onLogout} />

      <ScrollView
        style={ST.scroll}
        contentContainerStyle={ST.scrollInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* Hero Section */}
        <View style={ST.hero}>
          <Text style={ST.heroTitle}>{APP_NAME}</Text>
          <Text style={ST.heroSlogan}>The Pride of Mile 46 • The Wolves</Text>
          <View style={ST.heroButtons}>
            <TouchableOpacity style={ST.btnPrimary} onPress={() => navigation.navigate('Tickets')}>
              <Text style={ST.btnPrimaryText}>Buy Tickets</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ST.btnSecondary} onPress={() => navigation.navigate('Fixtures')}>
              <Text style={ST.btnSecondaryText}>View Fixtures</Text>
            </TouchableOpacity>
          </View>
        </View>

        {user && <Text style={ST.welcome}>Welcome back, {user.full_name || user.username || 'Fan'}</Text>}
        {!!errorBanner && (
          <View style={ST.errorBar}>
            <Text style={ST.errorText}>{errorBanner}</Text>
            <TouchableOpacity onPress={loadHomeData}><Text style={ST.errorRetry}>Retry</Text></TouchableOpacity>
          </View>
        )}

        {/* Quick Stats Grid */}
        <View style={ST.statsGrid}>
          <StatCard
            label="Next Match"
            value={loading ? '—' : (nextMatch ? `${nextMatch.opponent}` : 'TBA')}
            detail={loading ? '' : (nextMatch ? formatDateTime(nextMatch.match_date) : '')}
            extra={loading ? '' : countdown}
          />
          <StatCard
            label="Last Result"
            value={loading ? '—' : (lastResult ? `${lastResult.lt} ${lastResult.ls}-${lastResult.rs} ${lastResult.rt}` : 'No result')}
            detail={loading ? '' : (lastMatch ? formatDate(lastMatch.match_date) : '')}
          />
          <StatCard
            label="League Position"
            value={loading ? '—' : `${teamStats.points} pts`}
            detail={loading ? '' : `${teamStats.played} played`}
            extra={loading ? '' : `${teamStats.wins}W ${teamStats.draws}D ${teamStats.losses}L`}
          />
          <StatCard
            label="Top Scorer"
            value={loading ? '—' : (topScorer ? topScorer.name : 'No goals')}
            detail={loading ? '' : (topScorer ? `${topScorer.goals} goals` : '')}
          />
        </View>

        {/* Latest News Section */}
        <SectionHead title="Latest News" action="View All" onAction={() => navigation.navigate('News')} />
        {loading ? (
          <Loader />
        ) : newsArticles.length === 0 ? (
          <View style={ST.emptyNews}><Text style={ST.emptyText}>No news articles available.</Text></View>
        ) : (
          <View style={ST.newsGrid}>
            {newsArticles.slice(0, 6).map((article) => (
              <NewsCard
                key={article.newsID}
                article={article}
                onPress={() => showNewsModal(article)}
                formatDate={formatDate}
                width={CARD_WIDTH}
              />
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* News Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={ST.modalOverlay}>
          <View style={ST.modalSheet}>
            <View style={ST.modalHeader}>
              <Text style={ST.modalHeaderTitle}>Article</Text>
              <TouchableOpacity onPress={closeModal} style={ST.modalClose}><Text style={ST.modalCloseText}>✕</Text></TouchableOpacity>
            </View>
            {selectedArticle ? (
              <ScrollView style={ST.modalBody}>
                <View style={[ST.modalCat, { backgroundColor: (selectedArticle.category === 'match-report' ? C.red : selectedArticle.category === 'transfer' ? C.primary : selectedArticle.category === 'announcement' ? C.green : C.textMuted) + '18' }]}>
                  <Text style={[ST.modalCatText, { color: selectedArticle.category === 'match-report' ? C.red : selectedArticle.category === 'transfer' ? C.primary : selectedArticle.category === 'announcement' ? C.green : C.textMuted }]}>
                    {(selectedArticle.category || 'announcement').toUpperCase()}
                  </Text>
                </View>
                <Text style={ST.modalTitle}>{selectedArticle.title}</Text>
                <Text style={ST.modalMeta}>{formatDate(selectedArticle.published_date)}</Text>
                <View style={ST.modalDivider} />
                <Text style={ST.modalText}>{selectedArticle.content || selectedArticle.excerpt || ''}</Text>
              </ScrollView>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}><ActivityIndicator color={C.primary} /></View>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ── Sub‑components ── */
function SectionHead({ title, action, onAction }) {
  return (
    <View style={ST.secHead}>
      <Text style={ST.secTitle}>{title}</Text>
      {action && <TouchableOpacity onPress={onAction}><Text style={ST.secAction}>{action}</Text></TouchableOpacity>}
    </View>
  );
}

function StatCard({ label, value, detail, extra }) {
  return (
    <View style={ST.statCard}>
      <Text style={ST.statLabel}>{label}</Text>
      <Text style={ST.statValue}>{value}</Text>
      {detail ? <Text style={ST.statDetail}>{detail}</Text> : null}
      {extra ? <Text style={ST.statExtra}>{extra}</Text> : null}
    </View>
  );
}

function NewsCard({ article, onPress, formatDate, width }) {
  const categoryColor =
    article.category === 'match-report' ? C.red :
    article.category === 'transfer' ? C.primary :
    article.category === 'announcement' ? C.green : C.textMuted;

  return (
    <TouchableOpacity style={[ST.newsCard, { width }]} activeOpacity={0.8} onPress={onPress}>
      <View style={[ST.newsImagePlaceholder, { backgroundColor: categoryColor + '20' }]}>
        <Text style={[ST.newsImageEmoji, { color: categoryColor }]}>📰</Text>
      </View>
      <View style={ST.newsContent}>
        <View style={[ST.newsCategoryBadge, { backgroundColor: categoryColor + '18' }]}>
          <Text style={[ST.newsCategoryText, { color: categoryColor }]}>
            {article.category.toUpperCase()}
          </Text>
        </View>
        <Text style={ST.newsTitle} numberOfLines={2}>{article.title}</Text>
        <Text style={ST.newsMeta}>{formatDate(article.published_date)}</Text>
        <Text style={ST.newsExcerpt} numberOfLines={2}>{article.excerpt}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Loader() {
  return (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <ActivityIndicator color={C.primary} />
    </View>
  );
}

const ST = StyleSheet.create({
  root:       { flex: 1 },
  scroll:     { flex: 1 },
  scrollInner:{ paddingHorizontal: 16, paddingBottom: 24 },

  logoCircle:      { width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  logoCircleText:  { fontSize: 28, fontWeight: '900', color: '#FFF' },

  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.05)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  heroSlogan: {
    fontSize: 16,
    color: C.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: C.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnPrimaryText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  btnSecondaryText: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 14,
  },

  welcome:   { fontSize: 14, color: C.textDark, fontWeight: '600', marginBottom: 12 },

  errorBar:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.red + '15', borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, color: C.red, fontWeight: '500', flex: 1 },
  errorRetry:{ fontSize: 13, color: C.primary, fontWeight: '700' },

  secHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  secTitle:  { fontSize: 18, fontWeight: '800', color: C.primaryDark },
  secAction: { fontSize: 13, color: C.primary, fontWeight: '600' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: C.border,
  },
  statLabel: { fontSize: 11, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  statValue: { fontSize: 16, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  statDetail:{ fontSize: 12, color: C.textSecondary },
  statExtra: { fontSize: 13, fontWeight: '700', color: C.primary, marginTop: 6 },

  newsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginTop: 4,
  },
  newsCard: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 4,
  },
  newsImagePlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsImageEmoji: {
    fontSize: 40,
  },
  newsContent: {
    padding: 14,
  },
  newsCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  newsCategoryText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textDark,
    marginBottom: 4,
    lineHeight: 21,
  },
  newsMeta: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 8,
  },
  newsExcerpt: {
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 18,
  },
  emptyNews: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: C.textMuted },

  modalOverlay:{ flex: 1, backgroundColor: 'rgba(27,79,114,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalSheet:  { backgroundColor: '#FFFFFF', borderRadius: 18, width: '100%', maxWidth: 540, maxHeight: '85%', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  modalHeaderTitle:{ fontSize: 14, fontWeight: '800', color: C.primaryDark },
  modalClose:  { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary + '10', alignItems: 'center', justifyContent: 'center' },
  modalCloseText:{ fontSize: 14, color: C.primaryDark, fontWeight: '700' },
  modalBody:   { padding: 20 },
  modalCat:    { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  modalCatText:{ fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: C.primaryDark, marginBottom: 6, lineHeight: 26 },
  modalMeta:   { fontSize: 11, color: C.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  modalDivider:{ height: 3, width: 32, borderRadius: 2, backgroundColor: C.primary, marginBottom: 14 },
  modalText:   { fontSize: 14, color: C.textSecondary, lineHeight: 24 },
});