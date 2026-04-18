// frontend/src/screens/GalleryScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  ActivityIndicator, RefreshControl, StatusBar, Image, Dimensions,
  Alert, Platform, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { API_BASE_URL } from '../constants/config';
import NavBar from '../components/common/NavBar';

const { width } = Dimensions.get('window');

// Helper to construct full URL to the image file
const resolveUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const root = API_BASE_URL.replace(/\/api$/, '');
  return `${root}${url.startsWith('/') ? url : `/${url}`}`;
};

const C = {
  card: 'rgba(255,255,255,0.88)',
  accent: '#2E86C1',
  navy: '#1B4F72',
  muted: '#85929E',
  secText: '#5D6D7E',
  red: '#E74C3C',
  white: '#FFFFFF',
};
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

export default function GalleryScreen({ navigation, onLogout }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const loadGallery = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`${API_BASE_URL}/gallery`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (d.success) setPhotos(Array.isArray(d.data) ? d.data : []);
      else setError(d.message || 'Failed to load gallery');
    } catch (err) {
      console.error('Load gallery error:', err);
      setError('Failed to connect.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGallery();
  }, [loadGallery]);

  const showModal = useCallback((p) => {
    setSelectedPhoto(p);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedPhoto(null);
    setModalVisible(false);
  }, []);

  const formatDate = (d) => {
    if (!d) return '';
    const n = /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d;
    const dt = new Date(n);
    return Number.isNaN(dt.getTime())
      ? ''
      : dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const aspectRatio = (item) => {
    if (item.width && item.height) return item.width / item.height;
    if (item.orientation) {
      if (item.orientation.startsWith('portrait')) return 9 / 16;
      if (item.orientation.startsWith('land')) return 16 / 9;
    }
    return 4 / 3;
  };

  // 📥 Download Handler — works on Web, iOS, and Android
  const handleDownload = async () => {
    if (!selectedPhoto?.image_url) {
      Alert.alert('Error', 'No image to download');
      return;
    }

    const imageUrl = resolveUrl(selectedPhoto.image_url);
    console.log('[Gallery] Download URL:', imageUrl);
    if (!imageUrl) {
      Alert.alert('Error', 'Invalid image URL');
      return;
    }

    setDownloading(true);
    try {
      if (Platform.OS === 'web') {
        // 🌐 Web: trigger browser download
        const fileName = `FC_Inkiwanjani_${selectedPhoto.title || 'photo'}_${selectedPhoto.galleryID}.jpg`;
        try {
          // Fetch as blob to force download (avoids CORS issues with anchor download)
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          Alert.alert('Success', 'Image download started');
        } catch (fetchError) {
          console.warn('[Gallery] Blob download failed, falling back to anchor:', fetchError);
          // Fallback: direct anchor (may open in new tab if server doesn't set Content-Disposition)
          const link = document.createElement('a');
          link.href = imageUrl;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          Alert.alert('Info', 'If download doesn\'t start, right-click the image and select "Save Image As..."');
        }
      } else {
        // 📱 Native: use Expo MediaLibrary
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library to save images.');
          return;
        }

        const fileExt = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        const fileName = `fc_inkiwanjani_${selectedPhoto.galleryID}_${Date.now()}.${fileExt}`;
        const fileUri = FileSystem.cacheDirectory + fileName;

        const downloadRes = await FileSystem.downloadAsync(imageUrl, fileUri);
        if (downloadRes.status !== 200) {
          throw new Error(`Download failed with status ${downloadRes.status}`);
        }

        const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);
        await MediaLibrary.createAlbumAsync('FC Inkiwanjani', asset, false);
        Alert.alert('Success', 'Image saved to your gallery');
      }
    } catch (err) {
      console.error('[Gallery] Download error:', err);
      Alert.alert('Error', `Failed to download: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <State loading />;
  if (error) return <State error={error} onRetry={loadGallery} />;

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NavBar navigation={navigation} activeScreen="Gallery" onLogout={onLogout} />
      <ScrollView
        style={ST.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
      >
        <View style={ST.body}>
          <Text style={ST.pageTitle}>Gallery</Text>
          {photos.length === 0 ? (
            <Text style={ST.emptyText}>No photos yet</Text>
          ) : (
            <>
              <Text style={ST.photoCount}>
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </Text>
              <View style={ST.grid}>
                {photos.map((item) => {
                  const url = resolveUrl(item.image_url);
                  return (
                    <TouchableOpacity
                      key={item.galleryID}
                      style={ST.gridItem}
                      activeOpacity={0.85}
                      onPress={() => showModal(item)}
                    >
                      {url ? (
                        <Image source={{ uri: url }} style={ST.gridImg} resizeMode="cover" />
                      ) : (
                        <View style={ST.imgPh}>
                          <Text style={{ fontSize: 28, color: C.muted, opacity: 0.4 }}>📷</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      <Modal animationType="slide" visible={modalVisible} onRequestClose={closeModal}>
        <LinearGradient colors={BG} style={ST.modalRoot}>
          <View style={ST.modalHeader}>
            <Text style={ST.modalHeaderTitle}>Photo</Text>
            <View style={ST.modalActions}>
              <TouchableOpacity
                style={[ST.modalIconButton, downloading && ST.modalIconButtonDisabled]}
                onPress={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={C.accent} />
                ) : (
                  <Text style={ST.modalIconText}>⬇️</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={ST.modalClose} onPress={closeModal}>
                <Text style={ST.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          {selectedPhoto ? (
            <ScrollView style={ST.modalBody}>
              {(() => {
                const url = resolveUrl(selectedPhoto.image_url);
                const ar = aspectRatio(selectedPhoto);
                const h = Math.min(width * (1 / ar), 400);
                return url ? (
                  <Image
                    source={{ uri: url }}
                    style={[ST.modalImg, { aspectRatio: ar, height: h }]}
                    resizeMode="contain"
                  />
                ) : (
                  <View
                    style={[
                      ST.modalImg,
                      {
                        aspectRatio: ar,
                        height: h,
                        backgroundColor: C.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 40, opacity: 0.3, color: C.muted }}>📷</Text>
                  </View>
                );
              })()}
              <Text style={ST.modalTitle}>{selectedPhoto.title || 'Untitled'}</Text>
              {selectedPhoto.description && (
                <Text style={ST.modalDesc}>{selectedPhoto.description}</Text>
              )}
              <View style={ST.modalDivider} />
              <Text style={ST.modalMeta}>
                📅 {formatDate(selectedPhoto.upload_date)}
                {selectedPhoto.matchID ? ` · Match #${selectedPhoto.matchID}` : ''}
              </Text>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
              <ActivityIndicator color={C.accent} />
            </View>
          )}
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

function State({ loading, error, onRetry }) {
  return (
    <LinearGradient colors={BG} style={[ST.root, { justifyContent: 'center', alignItems: 'center' }]}>
      {loading ? (
        <ActivityIndicator color={C.accent} />
      ) : (
        <>
          <Text style={[ST.emptyText, { color: C.red, marginBottom: 12 }]}>{error}</Text>
          <TouchableOpacity style={ST.retryBtn} onPress={onRetry}>
            <Text style={ST.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </>
      )}
    </LinearGradient>
  );
}

const ST = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  body: { padding: 16, paddingTop: 8 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 14 },
  photoCount: { fontSize: 12, color: C.muted, marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  gridItem: { width: `${100 / 3}%`, padding: 4 },
  gridImg: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  imgPh: {
    width: '100%',
    height: 200,
    backgroundColor: C.navy + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 8 },
  retryBtn: {
    backgroundColor: C.accent,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.navy + '15',
  },
  modalHeaderTitle: { fontSize: 14, fontWeight: '800', color: C.navy },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.navy + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconButtonDisabled: {
    opacity: 0.6,
  },
  modalIconText: {
    fontSize: 16,
  },
  modalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.navy + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 14, color: C.navy, fontWeight: '700' },
  modalBody: { padding: 16 },
  modalImg: { width: '100%', borderRadius: 12, marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.navy, marginBottom: 4 },
  modalDesc: { fontSize: 13, color: C.secText, lineHeight: 20, marginBottom: 10 },
  modalDivider: { height: 3, width: 32, borderRadius: 2, backgroundColor: C.accent, marginBottom: 12 },
  modalMeta: { fontSize: 12, color: C.muted },
});