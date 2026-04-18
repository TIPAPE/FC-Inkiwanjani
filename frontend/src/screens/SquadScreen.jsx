// frontend/src/screens/SquadScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../components/common/NavBar';
import { API_BASE_URL } from '../constants/config';

const POSITIONS = ['all', 'goalkeeper', 'defender', 'midfielder', 'forward'];

const C = { card: 'rgba(255,255,255,0.85)', accent: '#2E86C1', navy: '#1B4F72', secText: '#5D6D7E', muted: '#85929E', green: '#27AE60', red: '#E74C3C' };
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

export default function SquadScreen({ navigation, onLogout }) {
  const [players, setPlayers] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadPlayers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE_URL}/players`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.success) setPlayers((Array.isArray(d.data) ? d.data : []).sort((a, b) => a.jersey_number - b.jersey_number));
      else setError(d.message);
    } catch { setError('Failed to connect to server.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadPlayers(); }, [loadPlayers]);
  useEffect(() => { setFiltered(activeFilter === 'all' ? players : players.filter(p => p.position === activeFilter)); }, [players, activeFilter]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadPlayers(); }, [loadPlayers]);
  const posAbbr = p => p === 'goalkeeper' ? 'GK' : p === 'defender' ? 'DEF' : p === 'midfielder' ? 'MID' : p === 'forward' ? 'FWD' : '—';

  const squadStats = { total: players.length, goals: players.reduce((s, p) => s + (Number(p.goals) || 0), 0), assists: players.reduce((s, p) => s + (Number(p.assists) || 0), 0) };

  const renderCard = ({ item }) => {
    const g = Number(item.goals) || 0, a = Number(item.assists) || 0, apps = Number(item.appearances) || 0;
    return (
      <View style={ST.card}>
        <View style={ST.avatar}><Text style={ST.avatarText}>#{item.jersey_number}</Text></View>
        <Text style={ST.name} numberOfLines={1}>{item.name}</Text>
        <Text style={ST.pos}>{posAbbr(item.position)}</Text>
        <View style={ST.statsRow}>
          <View style={ST.stat}><Text style={ST.statVal}>{g}</Text><Text style={ST.statLbl}>G</Text></View>
          <View style={ST.stat}><Text style={ST.statVal}>{a}</Text><Text style={ST.statLbl}>A</Text></View>
          <View style={ST.stat}><Text style={ST.statVal}>{apps}</Text><Text style={ST.statLbl}>Apps</Text></View>
        </View>
      </View>
    );
  };

  if (loading) return <State loading />;
  if (error) return <State error={error} onRetry={loadPlayers} />;

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NavBar navigation={navigation} activeScreen="Players" onLogout={onLogout} />
      <ScrollView style={ST.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
        <View style={ST.body}>
          <Text style={ST.pageTitle}>Squad</Text>
          <View style={ST.summaryRow}>
            <StatPill value={squadStats.total} label="Players" />
            <StatPill value={squadStats.goals} label="Goals" />
            <StatPill value={squadStats.assists} label="Assists" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ST.filters} style={{ marginBottom: 12 }}>
            {POSITIONS.map(f => {
              const label = f === 'all' ? 'All' : posAbbr(f);
              const count = f === 'all' ? players.length : players.filter(p => p.position === f).length;
              return <TouchableOpacity key={f} style={[ST.filter, activeFilter === f && ST.filterOn]} onPress={() => setActiveFilter(f)}><Text style={[ST.filterText, activeFilter === f && ST.filterTextOn]}>{label} ({count})</Text></TouchableOpacity>;
            })}
          </ScrollView>
          {filtered.length > 0 ? <FlatList data={filtered} renderItem={renderCard} keyExtractor={i => i.playerID.toString()} numColumns={3} columnWrapperStyle={ST.row} scrollEnabled={false} /> : <Text style={ST.emptyText}>No players in this category</Text>}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function StatPill({ value, label }) { return <View style={ST.statPill}><Text style={ST.statPillVal}>{value}</Text><Text style={ST.statPillLbl}>{label}</Text></View>; }
function State({ loading, error, onRetry }) {
  return <LinearGradient colors={BG} style={[ST.root, { justifyContent: 'center', alignItems: 'center' }]}>{loading ? <ActivityIndicator color={C.accent} /> : <><Text style={[ST.emptyText, { color: C.red, marginBottom: 12 }]}>{error}</Text><TouchableOpacity style={ST.retryBtn} onPress={onRetry}><Text style={ST.retryBtnText}>Retry</Text></TouchableOpacity></>}</LinearGradient>;
}

const ST = StyleSheet.create({
  root: { flex: 1 }, scroll: { flex: 1 }, body: { padding: 16, paddingTop: 8 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statPill: { flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  statPillVal: { fontSize: 22, fontWeight: '900', color: C.navy },
  statPillLbl: { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  filters: { gap: 8, paddingRight: 16 },
  filter: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: C.card },
  filterOn: { backgroundColor: C.accent },
  filterText: { fontSize: 11, fontWeight: '700', color: C.muted },
  filterTextOn: { color: '#FFFFFF' },
  row: { justifyContent: 'space-between', marginBottom: 10 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 12, alignItems: 'center', width: '32%', shadowColor: C.accent, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  name: { fontSize: 11, fontWeight: '700', color: C.navy, textAlign: 'center' },
  pos: { fontSize: 9, fontWeight: '800', color: C.accent, textTransform: 'uppercase', marginTop: 2, marginBottom: 6 },
  statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: C.navy + '12', paddingTop: 6 },
  stat: { width: '33%', alignItems: 'center' },
  statVal: { fontSize: 14, fontWeight: '800', color: C.navy },
  statLbl: { fontSize: 8, color: C.muted, marginTop: 1 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 8 },
  retryBtn: { backgroundColor: C.accent, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});