// frontend/src/screens/NewsScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, ActivityIndicator, RefreshControl, Pressable, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../components/common/NavBar';
import { API_BASE_URL } from '../constants/config';

const CATEGORIES = [{ key: 'all', label: 'All' }, { key: 'match-report', label: 'Match Reports' }, { key: 'transfer', label: 'Transfers' }, { key: 'announcement', label: 'Announcements' }, { key: 'community', label: 'Community' }];
const CC = { 'match-report': '#E74C3C', transfer: '#2E86C1', announcement: '#27AE60', community: '#8E44AD', default: '#85929E' };
const C = { card: 'rgba(255,255,255,0.85)', accent: '#2E86C1', navy: '#1B4F72', secText: '#5D6D7E', muted: '#85929E', red: '#E74C3C', green: '#27AE60' };
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

export default function NewsScreen({ navigation, onLogout }) {
  const [allArticles, setAllArticles] = useState([]);
  const [articles, setArticles] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const loadNews = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`${API_BASE_URL}/news`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.success) setAllArticles(Array.isArray(d.data) ? d.data : []);
      else setError(d.message);
    } catch { setError('Failed to connect.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadNews(); }, [loadNews]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadNews(); }, [loadNews]);
  useEffect(() => { setArticles(activeCategory === 'all' ? allArticles : allArticles.filter(a => a.category === activeCategory)); }, [allArticles, activeCategory]);

  const showModal = useCallback(a => { setSelectedArticle(a); setModalVisible(true); }, []);
  const closeModal = useCallback(() => { setModalVisible(false); setSelectedArticle(null); }, []);
  const formatDate = d => { if (!d) return ''; const n = /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d; const dt = new Date(n); return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };
  const catColor = c => CC[c] || CC.default;
  const catLabel = c => (c || 'news').replace('-', ' ').toUpperCase();

  const renderCard = ({ item }) => (
    <TouchableOpacity style={ST.card} onPress={() => showModal(item)} activeOpacity={0.7}>
      <View style={ST.cardIcon}><Text style={{ fontSize: 24 }}>📰</Text></View>
      <View style={[ST.catPill, { backgroundColor: catColor(item.category) + '18' }]}><Text style={[ST.catPillText, { color: catColor(item.category) }]}>{catLabel(item.category)}</Text></View>
      <Text style={ST.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={ST.cardMeta}>{formatDate(item.published_date)}</Text>
      <Text style={ST.cardExcerpt} numberOfLines={2}>{item.excerpt || item.content?.slice(0, 90) || ''}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NavBar navigation={navigation} activeScreen="News" onLogout={onLogout} />
      <ScrollView style={ST.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
        <View style={ST.body}>
          <Text style={ST.pageTitle}>Latest News</Text>
          {!loading && !error && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ST.filters} style={{ marginBottom: 12 }}>
              {CATEGORIES.map(c => {
                const count = c.key === 'all' ? allArticles.length : allArticles.filter(a => a.category === c.key).length;
                const on = activeCategory === c.key;
                return <TouchableOpacity key={c.key} style={[ST.filter, on && ST.filterOn]} onPress={() => setActiveCategory(c.key)}><Text style={[ST.filterText, on && ST.filterTextOn]}>{c.label} ({count})</Text></TouchableOpacity>;
              })}
            </ScrollView>
          )}
          {loading ? <State text="Loading…" /> : error ? <State text={error} error onRetry={loadNews} /> : articles.length === 0 ? <Text style={ST.emptyText}>No articles found</Text> : <FlatList data={articles} renderItem={renderCard} keyExtractor={i => i.newsID.toString()} numColumns={2} columnWrapperStyle={ST.row} scrollEnabled={false} />}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={ST.modalOverlay} onPress={closeModal}>
          <Pressable style={ST.modalSheet} onPress={e => e.stopPropagation()}>
            {selectedArticle && <ScrollView style={ST.modalBody}>
              <View style={[ST.modalCatPill, { backgroundColor: catColor(selectedArticle.category) + '18' }]}><Text style={[ST.modalCatPillText, { color: catColor(selectedArticle.category) }]}>{catLabel(selectedArticle.category)}</Text></View>
              <Text style={ST.modalTitle}>{selectedArticle.title}</Text>
              <Text style={ST.modalMeta}>{formatDate(selectedArticle.published_date)}</Text>
              <View style={ST.modalDivider} />
              <Text style={ST.modalText}>{selectedArticle.content || selectedArticle.excerpt || ''}</Text>
            </ScrollView>}
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

function State({ text, error, onRetry }) { return <View style={{ alignItems: 'center', paddingVertical: 48 }}><Text style={[ST.emptyText, error && { color: C.red }]}>{text}</Text>{onRetry && <TouchableOpacity style={ST.retryBtn} onPress={onRetry}><Text style={ST.retryBtnText}>Retry</Text></TouchableOpacity>}</View>; }

const ST = StyleSheet.create({
  root: { flex: 1 }, scroll: { flex: 1 }, body: { padding: 16, paddingTop: 8 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 14 },
  filters: { gap: 8, paddingRight: 16 },
  filter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.card },
  filterOn: { backgroundColor: C.accent },
  filterText: { fontSize: 11, fontWeight: '700', color: C.muted },
  filterTextOn: { color: '#FFFFFF' },
  row: { justifyContent: 'space-between', marginBottom: 10 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, width: '48.5%', shadowColor: C.accent, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.accent + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  catPill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, marginBottom: 8 },
  catPillText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.navy, lineHeight: 18, marginBottom: 4 },
  cardMeta: { fontSize: 9, color: C.muted, marginBottom: 4 },
  cardExcerpt: { fontSize: 11, color: C.secText, lineHeight: 16 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center' },
  retryBtn: { backgroundColor: C.accent, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 10, marginTop: 12 },
  retryBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(27,79,114,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalSheet: { backgroundColor: C.card, borderRadius: 18, width: '100%', maxWidth: 540, maxHeight: '85%', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  modalBody: { padding: 20 },
  modalCatPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, marginBottom: 10 },
  modalCatPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.navy, marginBottom: 6, lineHeight: 26 },
  modalMeta: { fontSize: 11, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  modalDivider: { height: 3, width: 32, borderRadius: 2, backgroundColor: C.accent, marginBottom: 14 },
  modalText: { fontSize: 14, color: C.secText, lineHeight: 24 },
});