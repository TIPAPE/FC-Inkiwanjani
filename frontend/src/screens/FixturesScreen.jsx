// frontend/src/screens/FixturesScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../components/common/NavBar';
import { API_BASE_URL, APP_NAME } from '../constants/config';

const FILTERS = ['all', 'upcoming', 'completed', 'home', 'away'];

const C = {
  card: 'rgba(255,255,255,0.85)', accent: '#2E86C1', navy: '#1B4F72',
  secText: '#5D6D7E', muted: '#85929E', green: '#27AE60', red: '#E74C3C',
};
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

export default function FixturesScreen({ navigation, onLogout }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [matches, setMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const r = await fetch(`${API_BASE_URL}/matches`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.success) {
        const s = (Array.isArray(d.data) ? d.data : []).sort((a, b) => {
          if (a.status === 'upcoming' && b.status === 'upcoming') return new Date(a.match_date) - new Date(b.match_date);
          if (a.status === 'completed' && b.status === 'completed') return new Date(b.match_date) - new Date(a.match_date);
          return a.status === 'upcoming' ? -1 : 1;
        });
        setAllMatches(s);
      } else setError(d.message);
    } catch { setError('Failed to connect to server.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);
  useEffect(() => {
    setMatches(activeFilter === 'all' ? allMatches : allMatches.filter(m => {
      if (activeFilter === 'home' || activeFilter === 'away') return m.venue === activeFilter;
      return m.status === activeFilter;
    }));
  }, [allMatches, activeFilter]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchMatches(); }, [fetchMatches]);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBA';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';

  const getResultInfo = (m) => {
    if (m.status !== 'completed' || m.home_score == null) return null;
    const ours = m.venue === 'home' ? m.home_score : m.away_score;
    const theirs = m.venue === 'home' ? m.away_score : m.home_score;
    if (ours > theirs) return { label: 'W', color: C.green };
    if (ours === theirs) return { label: 'D', color: C.accent };
    return { label: 'L', color: C.red };
  };

  const stats = { upcoming: allMatches.filter(m => m.status === 'upcoming').length, completed: allMatches.filter(m => m.status === 'completed').length };

  if (loading) return <State loading />;
  if (error) return <State error={error} onRetry={fetchMatches} />;

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NavBar navigation={navigation} activeScreen="Fixtures" onLogout={onLogout} />
      <ScrollView style={ST.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
        <View style={ST.body}>
          <Text style={ST.pageTitle}>Fixtures & Results</Text>

          <View style={ST.statsRow}>
            <StatPill label="Upcoming" value={stats.upcoming} />
            <StatPill label="Completed" value={stats.completed} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ST.filters} style={{ marginBottom: 12 }}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f} style={[ST.filter, activeFilter === f && ST.filterOn]} onPress={() => setActiveFilter(f)}>
                <Text style={[ST.filterText, activeFilter === f && ST.filterTextOn]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {matches.length > 0 ? matches.map(m => {
            const res = getResultInfo(m);
            return (
              <View key={m.matchID} style={ST.card}>
                <View style={ST.cardHead}>
                  <Text style={ST.comp}>{(m.competition || '').charAt(0).toUpperCase() + (m.competition || '').slice(1)}</Text>
                  {res && <View style={[ST.resBadge, { backgroundColor: res.color + '18' }]}><Text style={[ST.resBadgeText, { color: res.color }]}>{res.label}</Text></View>}
                </View>
                <View style={ST.teams}>
                  <Text style={ST.teamName} numberOfLines={1}>{APP_NAME}</Text>
                  <Text style={ST.vs}>{m.status === 'completed' ? `${m.home_score} – ${m.away_score}` : 'VS'}</Text>
                  <Text style={ST.teamName} numberOfLines={1}>{m.opponent}</Text>
                </View>
                <Text style={ST.meta}>{formatDate(m.match_date)}{formatTime(m.match_date) ? ` · ${formatTime(m.match_date)}` : ''} · {m.venue === 'home' ? 'Home' : 'Away'}</Text>
                {m.status === 'upcoming' && <TouchableOpacity style={ST.ticketBtn} onPress={() => navigation.navigate('Tickets', { matchId: m.matchID })}><Text style={ST.ticketBtnText}>Buy Tickets</Text></TouchableOpacity>}
              </View>
            );
          }) : <Text style={ST.emptyText}>No matches found</Text>}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function StatPill({ label, value }) { return <View style={ST.statPill}><Text style={ST.statPillVal}>{value}</Text><Text style={ST.statPillLbl}>{label}</Text></View>; }
function State({ loading, error, onRetry }) {
  return <LinearGradient colors={BG} style={[ST.root, { justifyContent: 'center', alignItems: 'center' }]}>{loading ? <ActivityIndicator color={C.accent} /> : <><Text style={[ST.emptyText, { color: C.red, marginBottom: 12 }]}>{error}</Text><TouchableOpacity style={ST.retryBtn} onPress={onRetry}><Text style={ST.retryBtnText}>Retry</Text></TouchableOpacity></>}</LinearGradient>;
}

const ST = StyleSheet.create({
  root: { flex: 1 }, scroll: { flex: 1 }, body: { padding: 16, paddingTop: 8 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statPill: { flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  statPillVal: { fontSize: 22, fontWeight: '900', color: C.navy },
  statPillLbl: { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  filters: { gap: 8, paddingRight: 16 },
  filter: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: C.card },
  filterOn: { backgroundColor: C.accent },
  filterText: { fontSize: 11, fontWeight: '700', color: C.muted },
  filterTextOn: { color: '#FFFFFF' },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: C.accent, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  comp: { fontSize: 10, fontWeight: '700', color: C.accent, textTransform: 'uppercase', letterSpacing: 1 },
  resBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  resBadgeText: { fontSize: 10, fontWeight: '800' },
  teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  teamName: { fontSize: 14, fontWeight: '700', color: C.navy, flex: 1 },
  vs: { fontSize: 16, fontWeight: '900', color: C.accent, marginHorizontal: 12 },
  meta: { fontSize: 11, color: C.muted, marginBottom: 4 },
  ticketBtn: { backgroundColor: C.accent, paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  ticketBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 8 },
  retryBtn: { backgroundColor: C.accent, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});