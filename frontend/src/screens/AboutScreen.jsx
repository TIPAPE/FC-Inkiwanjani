// frontend/src/screens/AboutScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../components/common/NavBar';
import { API_BASE_URL, APP_NAME } from '../constants/config';

const DEFAULTS = { club_name: APP_NAME, nickname: 'The Wolves', founded_year: '2010', home_ground: 'Mile 46 Community Stadium', capacity: '5,000', ground_surface: 'Natural Grass', location: 'Mile 46, Kajiado County', head_coach: 'Peter Kamau', assistant_coach: 'Michael Ochieng', team_manager: 'Sarah Wanjiru', club_president: 'John Maina', director_football: 'David Kiprop', email: 'info@fcinkiwanjani.com', phone: '+254 748 234 887' };
const ACHIEVEMENTS = [{ icon: '🏆', text: 'Mile 46 Regional Champions 2022' }, { icon: '🥈', text: 'Kajiado County Cup Runners-up 2023' }, { icon: '🌟', text: 'Fair Play Award 2024' }, { icon: '⚽', text: 'Top Scorers — Regional League 2023/24' }];

const C = { card: 'rgba(255,255,255,0.85)', accent: '#2E86C1', navy: '#1B4F72', secText: '#5D6D7E', muted: '#85929E' };
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

export default function AboutScreen({ navigation, onLogout }) {
  const [clubInfo, setClubInfo] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const loadClubInfo = useCallback(async () => {
    try { const r = await fetch(`${API_BASE_URL}/settings/club-info`); if (!r.ok) return; const d = await r.json(); if (d.success && d.data) setClubInfo(p => ({ ...p, ...d.data })); } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadClubInfo(); }, [loadClubInfo]);

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NavBar navigation={navigation} activeScreen="About" onLogout={onLogout} />
      <ScrollView style={ST.scroll}>
        <View style={ST.body}>
          <Text style={ST.pageTitle}>About the Club</Text>
          {loading ? <View style={{ alignItems: 'center', paddingVertical: 40 }}><ActivityIndicator color={C.accent} /></View> : (
            <>
              <Section title="Club History">
                <Text style={ST.bodyText}>Founded in {clubInfo.founded_year}, {clubInfo.club_name} — known as "{clubInfo.nickname}" — has become the pride of Mile 46 and surrounding communities.</Text>
                <Text style={[ST.bodyText, { marginBottom: 0 }]}>The club was established by local football enthusiasts who shared a vision of creating a team that would represent Mile 46 with honor. Over the years, we've built a reputation for developing young talent and playing attractive, attacking football.</Text>
              </Section>
              <Section title="Achievements">
                {ACHIEVEMENTS.map((a, i) => <View key={i} style={[ST.achRow, i === ACHIEVEMENTS.length - 1 && { borderBottomWidth: 0 }]}><View style={ST.achIcon}><Text style={{ fontSize: 16 }}>{a.icon}</Text></View><Text style={ST.achText}>{a.text}</Text></View>)}
              </Section>
              <Section title="Stadium">
                <Row label="Home Ground" value={clubInfo.home_ground} />
                <Row label="Capacity" value={`${Number(String(clubInfo.capacity).replace(/,/g, '')).toLocaleString()} seats`} />
                <Row label="Surface" value={clubInfo.ground_surface} />
                <Row label="Location" value={clubInfo.location} last />
              </Section>
              <Section title="Management">
                <Row label="Head Coach" value={clubInfo.head_coach} />
                <Row label="Assistant Coach" value={clubInfo.assistant_coach} />
                <Row label="Team Manager" value={clubInfo.team_manager} />
                <Row label="Club President" value={clubInfo.club_president} />
                <Row label="Director of Football" value={clubInfo.director_football} last />
              </Section>
              <Section title="Get in Touch">
                <Row label="Address" value={clubInfo.location} />
                <Row label="Email" value={clubInfo.email} />
                <Row label="Phone" value={clubInfo.phone} last />
              </Section>
            </>
          )}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function Section({ title, children }) { return <View style={ST.section}><View style={ST.secHead}><Text style={ST.secTitle}>{title}</Text><View style={ST.secLine} /></View>{children}</View>; }
function Row({ label, value, last }) { return <View style={[ST.row, last && { borderBottomWidth: 0 }]}><Text style={ST.rowLabel}>{label}</Text><Text style={ST.rowVal}>{value || '—'}</Text></View>; }

const ST = StyleSheet.create({
  root: { flex: 1 }, scroll: { flex: 1 }, body: { padding: 16, paddingTop: 8 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 14 },
  section: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: C.accent, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  secTitle: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
  secLine: { flex: 1, height: 1, backgroundColor: C.navy + '15' },
  bodyText: { fontSize: 13, color: C.secText, lineHeight: 22, marginBottom: 10 },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.navy + '10' },
  achIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.accent + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  achText: { flex: 1, fontSize: 13, color: C.navy, fontWeight: '600' },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.navy + '10', gap: 8 },
  rowLabel: { fontSize: 11, fontWeight: '700', color: C.accent, width: 130, flexShrink: 0 },
  rowVal: { flex: 1, fontSize: 13, color: C.secText, lineHeight: 20 },
});