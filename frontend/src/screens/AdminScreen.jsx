// frontend/src/screens/AdminScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  StatusBar,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { authStorage } from '../utils/authStorage';
import { API_BASE_URL } from '../constants/config';
import * as ImagePicker from 'expo-image-picker';
import Notification from '../components/common/Notification';

const API_ROOT = API_BASE_URL.replace(/\/api$/, '');
console.log('[AdminScreen] API_ROOT =', API_ROOT);

const COLORS = {
  accent:      '#2E86C1',
  navy:        '#1B4F72',
  secText:     '#5D6D7E',
  muted:       '#85929E',
  green:       '#27AE60',
  red:         '#E74C3C',
  redDark:     '#7F1D1D',
  white:       '#FFFFFF',
  card:        'rgba(255,255,255,0.92)',
  cardAlt:     '#F8F9FA',
  border:      '#E8ECEF',
  inputBg:     '#FFFFFF',
  gold:        '#F39C12',
  goldDark:    '#D4860B',
  textPrimary: '#1B4F72',
  textSecondary:'#5D6D7E',
  textMuted:   '#85929E',
  textDim:     '#A0AEC0',
  danger:      '#E74C3C',
  dangerText:  '#C0392B',
  win:         '#27AE60',
};
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

const formatKES = (amount) =>
  `KES ${Number(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

const TABS_BY_ROLE = {
  editor: [{ id: 'add-news', label: 'News' }],
  admin: [
    { id: 'revenue',        label: 'Revenue'  },
    { id: 'players-manage', label: 'Players'  },
    { id: 'stats-update',   label: 'Stats'    },
    { id: 'match-results',  label: 'Results'  },
    { id: 'add-match',      label: 'Matches'  },
    { id: 'add-news',       label: 'News'     },
    { id: 'bookings',       label: 'Bookings' },
    { id: 'gallery',        label: 'Gallery'  },
    { id: 'comments',       label: 'Comments' },
    { id: 'polls',          label: 'Polls'    },
    { id: 'settings',       label: 'Settings' },
  ],
  super_admin: [
    { id: 'revenue',        label: 'Revenue'     },
    { id: 'players-manage', label: 'Players'     },
    { id: 'stats-update',   label: 'Stats'       },
    { id: 'match-results',  label: 'Results'     },
    { id: 'add-match',      label: 'Matches'     },
    { id: 'add-news',       label: 'News'        },
    { id: 'bookings',       label: 'Bookings'    },
    { id: 'gallery',        label: 'Gallery'     },
    { id: 'comments',       label: 'Comments'    },
    { id: 'polls',          label: 'Polls'       },
    { id: 'settings',       label: 'Settings'    },
    { id: 'manage-admins',  label: 'Admins'      },
  ],
};

export default function AdminScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  const [notification, setNotification] = useState({ message: '', type: 'info', visible: false });

  // Data state
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [revenueByMatch, setRevenueByMatch] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [membershipRevenueFromMemberships, setMembershipRevenueFromMemberships] = useState(0);

  // Gallery
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryDesc, setGalleryDesc] = useState('');
  const [galleryMatchID, setGalleryMatchID] = useState('');
  const [galleryImageUri, setGalleryImageUri] = useState(null);
  const [galleryAspectRatio, setGalleryAspectRatio] = useState('4:3');

  // Comments
  const [comments, setComments] = useState([]);

  // Bookings
  const [expandedMatches, setExpandedMatches] = useState({});

  // Polls
  const [polls, setPolls] = useState([]);
  const [pollQuestion, setPollQuestion] = useState('');
  const [selectedPollPlayers, setSelectedPollPlayers] = useState([]);

  // Settings
  const [ticketPrices, setTicketPrices] = useState({ vip: 0, regular: 0, student: 0 });
  const [priceForm, setPriceForm] = useState({ vip: 0, regular: 0, student: 0 });
  const [membershipFee, setMembershipFee] = useState(0);
  const [membershipFeeInput, setMembershipFeeInput] = useState('');

  // Forms
  const [newPlayer, setNewPlayer] = useState({ name: '', jersey_number: '', position: '', age: '' });
  const [newMatch, setNewMatch] = useState({ opponent: '', match_date: '', venue: 'home', competition: 'league' });
  const [matchResult, setMatchResult] = useState({ matchId: '', home_score: '', away_score: '', summary: '', attendance: '' });
  const [newNews, setNewNews] = useState({ title: '', category: 'match-report', content: '', excerpt: '' });
  const [merchandiseAmount, setMerchandiseAmount] = useState('');
  const [sponsorshipAmount, setSponsorshipAmount] = useState('');
  const [sponsorshipDescription, setSponsorshipDescription] = useState('');
  const [otherAmount, setOtherAmount] = useState('');
  const [otherDescription, setOtherDescription] = useState('');

  // Stats update wizard state
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [step, setStep] = useState(1); // 1=appearance, 2=goals, 3=assists, 4=cards, 5=save
  const [appearancePlayers, setAppearancePlayers] = useState({}); // playerId -> boolean (selected)
  const [goalsData, setGoalsData] = useState({});   // playerId -> string
  const [assistsData, setAssistsData] = useState({});
  const [yellowCardsData, setYellowCardsData] = useState({});
  const [redCardsData, setRedCardsData] = useState({});

  // Loading states
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStats, setSavingStats] = useState(false);

  // Admin management
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    full_name: '', username: '', email: '', password: '', role: 'admin',
  });

  // ----- Helper functions -----
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
  };
  const hideNotification = () => setNotification(prev => ({ ...prev, visible: false }));

  const apiCall = async (endpoint, method = 'GET', body = null) => {
    try {
      const token = await authStorage.getToken();
      if (!token) throw new Error('No authentication token found. Please log in again.');
      const url = `${API_ROOT}/api/admin${endpoint}`;
      console.log(`🔵 API CALL: ${method} ${url}`);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
        console.log(`🔵 Request body:`, body);
      }
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(`🟢 RESPONSE: ${response.status}`, data);
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      return data;
    } catch (error) {
      console.error(`🔴 API ERROR: ${method} ${endpoint}`, error);
      throw error;
    }
  };

  // ----- Data loading -----
  const loadDashboardData = async () => {
    try {
      const token = await authStorage.getToken();
      if (!token) return;
      const res = await fetch(`${API_ROOT}/api/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDashboardStats(data.data);
        setPlayers(data.data?.players?.list || []);
        const prices = data.data?.ticketPrices || { vip: 0, regular: 0, student: 0 };
        setTicketPrices(prices);
        setPriceForm(prices);
      }
    } catch (error) { console.error('Load dashboard error:', error); }
  };

  const loadMembershipRevenue = async () => {
    try {
      const data = await apiCall('/reports/membership');
      if (data.success && data.data?.statistics?.total_revenue) {
        setMembershipRevenueFromMemberships(Number(data.data.statistics.total_revenue));
      } else {
        setMembershipRevenueFromMemberships(0);
      }
    } catch (error) {
      console.error('Failed to load membership revenue from memberships table:', error);
      setMembershipRevenueFromMemberships(0);
    }
  };

  const loadPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const data = await apiCall('/players');
      if (data.success) {
        setPlayers(data.data);
      }
    } catch { showNotification('Failed to load players', 'error'); }
    finally { setLoadingPlayers(false); }
  };

  const loadMatches = async () => {
    setLoadingMatches(true);
    try {
      const data = await apiCall('/matches');
      if (data.success) setMatches(data.data);
    } catch { showNotification('Failed to load matches', 'error'); }
    finally { setLoadingMatches(false); }
  };

  const loadNews = async () => {
    setLoadingNews(true);
    try {
      const data = await apiCall('/news');
      if (data.success) setNewsArticles(data.data);
    } catch { showNotification('Failed to load news', 'error'); }
    finally { setLoadingNews(false); }
  };

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const data = await apiCall('/bookings');
      if (data.success) setBookings(data.data);
      else showNotification(data.message || 'Failed to load bookings', 'error');
    } catch (error) { showNotification(`Failed to load bookings: ${error.message}`, 'error'); }
    finally { setLoadingBookings(false); }
  };

  const loadSettings = async () => {
    try {
      const pricesData = await apiCall('/settings/ticket-prices');
      if (pricesData.success) { setTicketPrices(pricesData.data); setPriceForm(pricesData.data); }
      const settingsData = await apiCall('/settings');
      if (settingsData.success && settingsData.data?.membership_fee) {
        const fee = Number(settingsData.data.membership_fee) || 0;
        setMembershipFee(fee);
        setMembershipFeeInput(String(fee));
      }
    } catch { showNotification('Failed to load settings', 'error'); }
  };

  const loadGallery = async () => {
    setLoadingGallery(true);
    try {
      const data = await apiCall('/gallery');
      if (data.success) setGalleryItems(data.data || []);
    } catch { showNotification('Failed to load gallery', 'error'); }
    finally { setLoadingGallery(false); }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const data = await apiCall('/comments');
      if (data.success) setComments(data.data || []);
    } catch { showNotification('Failed to load comments', 'error'); }
    finally { setLoadingComments(false); }
  };

  const loadPolls = async () => {
    setLoadingPolls(true);
    try {
      const data = await apiCall('/polls');
      if (data.success) setPolls(data.data || []);
    } catch { showNotification('Failed to load polls', 'error'); }
    finally { setLoadingPolls(false); }
  };

  const loadAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const data = await apiCall('/admins');
      if (data.success) setAdmins(Array.isArray(data.data) ? data.data : []);
    } catch (error) { showNotification('Failed to load admins', 'error'); }
    finally { setLoadingAdmins(false); }
  };

  const loadRevenueByMatch = async () => {
    try {
      const data = await apiCall('/bookings/revenue-by-match');
      if (data.success) setRevenueByMatch(data.data || []);
    } catch (error) { console.error('Load revenue by match error:', error); }
  };

  const loadRevenueData = async () => {
    try {
      const token = await authStorage.getToken();
      if (!token) return;
      const res = await fetch(`${API_ROOT}/api/admin/reports/revenue?groupBy=month`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setRevenueData(data.data);
    } catch (error) { console.error('Load revenue data error:', error); }
  };

  // ----- Stats wizard functions -----
  const resetStatsWizard = () => {
    setSelectedMatchId('');
    setStep(1);
    setAppearancePlayers({});
    setGoalsData({});
    setAssistsData({});
    setYellowCardsData({});
    setRedCardsData({});
  };

  const handleSelectMatch = (matchId) => {
    setSelectedMatchId(matchId);
    setStep(1);
    // Reset all player-related selections
    setAppearancePlayers({});
    setGoalsData({});
    setAssistsData({});
    setYellowCardsData({});
    setRedCardsData({});
  };

  const togglePlayerAppearance = (playerId) => {
    setAppearancePlayers(prev => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };

  const updatePlayerStat = (playerId, field, value) => {
    const setters = {
      goals: setGoalsData,
      assists: setAssistsData,
      yellow: setYellowCardsData,
      red: setRedCardsData,
    };
    setters[field](prev => ({
      ...prev,
      [playerId]: value,
    }));
  };

  const getAppearanceList = () => {
    return Object.keys(appearancePlayers).filter(pid => appearancePlayers[pid]);
  };

  const goToNextStep = () => {
    if (step === 1 && getAppearanceList().length === 0) {
      showNotification('Please select at least one player who appeared in the match', 'error');
      return;
    }
    setStep(step + 1);
  };

  const goToPrevStep = () => {
    setStep(step - 1);
  };

  const saveAllStats = async () => {
    const selectedPlayerIds = getAppearanceList();
    if (selectedPlayerIds.length === 0) {
      showNotification('No players selected', 'error');
      return;
    }

    setSavingStats(true);
    try {
      // For each selected player, update stats
      for (const playerId of selectedPlayerIds) {
        const goals = parseInt(goalsData[playerId] || 0, 10);
        const assists = parseInt(assistsData[playerId] || 0, 10);
        const yellow_cards = parseInt(yellowCardsData[playerId] || 0, 10);
        const red_cards = parseInt(redCardsData[playerId] || 0, 10);
        // For appearances, we increment by 1 (since they played in this match)
        // But we need the current stats first. We'll fetch the player's current stats, then add.
        const player = players.find(p => p.playerID.toString() === playerId);
        if (!player) continue;
        const newAppearances = (player.appearances || 0) + 1;
        const newGoals = (player.goals || 0) + goals;
        const newAssists = (player.assists || 0) + assists;
        const newYellow = (player.yellow_cards || 0) + yellow_cards;
        const newRed = (player.red_cards || 0) + red_cards;

        await apiCall(`/players/${playerId}/stats`, 'PUT', {
          goals: newGoals,
          assists: newAssists,
          appearances: newAppearances,
          yellow_cards: newYellow,
          red_cards: newRed,
        });
      }
      showNotification(`Stats updated for ${selectedPlayerIds.length} players`, 'success');
      resetStatsWizard();
      await loadPlayers(); // refresh player list
    } catch (error) {
      showNotification(error.message || 'Failed to update stats', 'error');
    } finally {
      setSavingStats(false);
    }
  };

  // ----- Delete / Remove functions (unchanged) -----
  const removePlayer = (playerId, playerName) => {
    Alert.alert('Remove Player', `Remove ${playerName} from the squad?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiCall(`/players/${playerId}`, 'DELETE');
            showNotification(`${playerName} removed from squad`, 'success');
            await loadPlayers();
          } catch (error) {
            showNotification(error.message || 'Failed to remove player', 'error');
          }
        },
      },
    ]);
  };

  const deleteGalleryItem = (galleryId) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiCall(`/gallery/${galleryId}`, 'DELETE');
            showNotification('Photo deleted successfully', 'success');
            await loadGallery();
          } catch (error) {
            showNotification(error.message || 'Failed to delete photo', 'error');
          }
        },
      },
    ]);
  };

  const deletePoll = (pollId) => {
    Alert.alert('Delete Poll', 'Are you sure you want to delete this poll?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiCall(`/polls/${pollId}`, 'DELETE');
            showNotification('Poll deleted successfully', 'success');
            await loadPolls();
          } catch (error) {
            showNotification(error.message || 'Failed to delete poll', 'error');
          }
        },
      },
    ]);
  };

  const deactivatePoll = (pollId) => {
    Alert.alert('Deactivate Poll', 'This poll will no longer accept votes. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiCall(`/polls/${pollId}/deactivate`, 'PUT');
            showNotification('Poll deactivated successfully', 'success');
            await loadPolls();
          } catch (error) {
            showNotification(error.message || 'Failed to deactivate poll', 'error');
          }
        },
      },
    ]);
  };

  const deleteAdmin = (adminUserID, adminName) => {
    if (!adminUserID) {
      showNotification('Invalid admin ID', 'error');
      return;
    }
    Alert.alert('Delete Admin', `Remove ${adminName} from the admin team?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiCall(`/admins/${adminUserID}`, 'DELETE');
            showNotification(`${adminName} removed successfully`, 'success');
            await loadAdmins();
          } catch (error) {
            showNotification(error.message || 'Failed to delete admin', 'error');
          }
        },
      },
    ]);
  };

  const toggleCommentApproval = async (commentId) => {
    try {
      await apiCall(`/comments/${commentId}/approve`, 'PUT');
      showNotification('Comment approval toggled', 'success');
      await loadComments();
    } catch (error) {
      showNotification(error.message || 'Failed to toggle approval', 'error');
    }
  };

  // ----- Other CRUD actions (unchanged) -----
  const addPlayer = async () => {
    if (!newPlayer.name || !newPlayer.jersey_number || !newPlayer.position || !newPlayer.age) {
      showNotification('Please fill in all player fields', 'error');
      return;
    }
    const jerseyNum = parseInt(newPlayer.jersey_number, 10);
    const age = parseInt(newPlayer.age, 10);
    if (isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
      showNotification('Jersey number must be between 1 and 99', 'error');
      return;
    }
    if (isNaN(age) || age < 15 || age > 55) {
      showNotification('Age must be between 15 and 55', 'error');
      return;
    }
    try {
      await apiCall('/players', 'POST', {
        name: newPlayer.name.trim(),
        jersey_number: jerseyNum,
        position: newPlayer.position,
        age,
      });
      showNotification(`${newPlayer.name} added to squad`, 'success');
      setNewPlayer({ name: '', jersey_number: '', position: '', age: '' });
      await loadPlayers();
    } catch (error) {
      showNotification(error.message || 'Failed to add player', 'error');
    }
  };

  const addMatch = async () => {
    if (!newMatch.opponent || !newMatch.match_date) {
      showNotification('Opponent name and date are required', 'error');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(newMatch.match_date.trim())) {
      showNotification('Date must be in format: YYYY-MM-DD HH:MM:SS', 'error');
      return;
    }
    try {
      await apiCall('/matches', 'POST', {
        opponent: newMatch.opponent.trim(),
        match_date: newMatch.match_date.trim(),
        venue: newMatch.venue,
        competition: newMatch.competition,
      });
      showNotification(`Match vs ${newMatch.opponent} scheduled`, 'success');
      setNewMatch({ opponent: '', match_date: '', venue: 'home', competition: 'league' });
      await loadMatches();
    } catch (error) {
      showNotification(error.message || 'Failed to add match', 'error');
    }
  };

  const updateMatchResult = async () => {
    if (!matchResult.matchId || matchResult.home_score === '' || matchResult.away_score === '') {
      showNotification('Please select a match and enter both scores', 'error');
      return;
    }
    const homeScore = parseInt(matchResult.home_score, 10);
    const awayScore = parseInt(matchResult.away_score, 10);
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      showNotification('Scores must be valid non‑negative numbers', 'error');
      return;
    }
    try {
      await apiCall(`/matches/${matchResult.matchId}/result`, 'PUT', {
        home_score: homeScore,
        away_score: awayScore,
        summary: matchResult.summary.trim() || null,
        attendance: matchResult.attendance ? parseInt(matchResult.attendance, 10) : null,
      });
      showNotification('Match result saved', 'success');
      setMatchResult({ matchId: '', home_score: '', away_score: '', summary: '', attendance: '' });
      await loadMatches();
    } catch (error) {
      showNotification(error.message || 'Failed to update match result', 'error');
    }
  };

  const addNews = async () => {
    if (!newNews.title.trim() || !newNews.content.trim()) {
      showNotification('Title and content are required', 'error');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      await apiCall('/news', 'POST', {
        title: newNews.title.trim(),
        category: newNews.category,
        content: newNews.content.trim(),
        excerpt: newNews.excerpt.trim() || `${newNews.content.trim().substring(0, 200)}...`,
        author: user?.full_name || 'Admin',
        published_date: today,
      });
      showNotification('Article published', 'success');
      setNewNews({ title: '', category: 'match-report', content: '', excerpt: '' });
      await loadNews();
    } catch (error) {
      showNotification(error.message || 'Failed to publish article', 'error');
    }
  };

  const updateTicketPrices = async () => {
    const vip = parseInt(priceForm.vip, 10);
    const regular = parseInt(priceForm.regular, 10);
    const student = parseInt(priceForm.student, 10);
    if ([vip, regular, student].some(v => isNaN(v) || v <= 0)) {
      showNotification('All prices must be positive numbers', 'error');
      return;
    }
    try {
      await apiCall('/settings/ticket-prices', 'PUT', { vip, regular, student });
      setTicketPrices({ vip, regular, student });
      showNotification('Ticket prices updated', 'success');
    } catch (error) {
      showNotification(error.message || 'Failed to update prices', 'error');
    }
  };

  const recordRevenue = async (source, amount, description) => {
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      await apiCall('/revenue', 'POST', {
        source,
        amount: parsedAmount,
        description: description || `${source.charAt(0).toUpperCase() + source.slice(1)} income`,
        transaction_date: today,
      });
      showNotification(`${formatKES(parsedAmount)} recorded as ${source}`, 'success');
      if (source === 'merchandise') setMerchandiseAmount('');
      if (source === 'sponsorship') { setSponsorshipAmount(''); setSponsorshipDescription(''); }
      if (source === 'other') { setOtherAmount(''); setOtherDescription(''); }
      await loadDashboardData();
    } catch (error) {
      showNotification(error.message || `Failed to record ${source} revenue`, 'error');
    }
  };

  const updateMembershipFee = async () => {
    const fee = parseInt(membershipFeeInput, 10);
    if (isNaN(fee) || fee <= 0) {
      showNotification('Please enter a valid fee', 'error');
      return;
    }
    try {
      await apiCall('/settings/membership-fee', 'PUT', { fee });
      setMembershipFee(fee);
      showNotification('Membership fee updated', 'success');
    } catch (error) {
      showNotification(error.message || 'Failed to update fee', 'error');
    }
  };

  const createAdmin = async () => {
    const { full_name, username, email, password, role } = newAdminData;
    if (!full_name.trim() || !username.trim() || !email.trim() || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }
    if (password.length < 8) {
      showNotification('Password must be at least 8 characters', 'error');
      return;
    }
    try {
      await apiCall('/admins', 'POST', {
        full_name: full_name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      showNotification(`Admin ${full_name.trim()} created successfully`, 'success');
      setNewAdminData({ full_name: '', username: '', email: '', password: '', role: 'admin' });
      setShowAdminForm(false);
      await loadAdmins();
    } catch (error) {
      showNotification(error.message || 'Failed to create admin', 'error');
    }
  };

  const createPoll = async () => {
    if (!pollQuestion.trim()) {
      showNotification('Please enter a poll question', 'error');
      return;
    }
    if (selectedPollPlayers.length < 2) {
      showNotification('Please select at least 2 players', 'error');
      return;
    }
    try {
      await apiCall('/polls', 'POST', {
        question: pollQuestion.trim(),
        playerIDs: selectedPollPlayers.map(id => parseInt(id, 10)),
      });
      showNotification('Poll created successfully!', 'success');
      setPollQuestion('');
      setSelectedPollPlayers([]);
      await loadPolls();
    } catch (error) {
      showNotification(error.message || 'Failed to create poll', 'error');
    }
  };

  const togglePollPlayer = (playerId) => {
    const idStr = playerId.toString();
    setSelectedPollPlayers(prev =>
      prev.includes(idStr) ? prev.filter(id => id !== idStr) : [...prev, idStr]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showNotification('Please allow access to your photo library', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setGalleryImageUri(asset.uri);
      if (!galleryTitle) setGalleryTitle('Gallery Photo');
      if (asset.width && asset.height) {
        const ratio = asset.width / asset.height;
        if (ratio > 1.4) setGalleryAspectRatio('16:9');
        else if (ratio < 0.7) setGalleryAspectRatio('9:16');
        else setGalleryAspectRatio('4:3');
      }
    }
  };

  const uploadGalleryImage = async () => {
    if (!galleryImageUri) {
      showNotification('Please select an image to upload', 'error');
      return;
    }
    if (!galleryTitle.trim()) {
      showNotification('Please enter a title for the photo', 'error');
      return;
    }
    setLoadingGallery(true);
    try {
      let fileUri = galleryImageUri;
      if (Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://') && !fileUri.startsWith('http')) {
        fileUri = `file://${fileUri}`;
      } else if (Platform.OS === 'ios' && !fileUri.startsWith('file://')) {
        fileUri = `file://${fileUri}`;
      }
      const ext = fileUri.split('.').pop().toLowerCase().split('?')[0];
      let mimeType = 'image/jpeg';
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'webp') mimeType = 'image/webp';
      const fileName = `${galleryTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.${ext === 'png' ? 'png' : 'jpg'}`;
      const uploadUrl = `${API_ROOT}/api/admin/gallery/upload`;
      const token = await authStorage.getToken();

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        formData.append('image', new File([blob], fileName, { type: mimeType }));
      } else {
        formData.append('image', { uri: fileUri, name: fileName, type: mimeType });
      }
      formData.append('title', galleryTitle.trim());
      if (galleryDesc.trim()) formData.append('description', galleryDesc.trim());
      if (galleryMatchID) formData.append('matchID', String(galleryMatchID));

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      showNotification('Image uploaded successfully!', 'success');
      setGalleryTitle('');
      setGalleryDesc('');
      setGalleryMatchID('');
      setGalleryImageUri(null);
      setGalleryAspectRatio('4:3');
      await loadGallery();
    } catch (error) {
      showNotification(error.message || 'Failed to upload image', 'error');
    } finally {
      setLoadingGallery(false);
    }
  };

  // ----- Group bookings -----
  const groupBookingsByMatch = () => {
    const grouped = {};
    bookings.forEach(b => {
      const key = b.matchID || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          matchID: b.matchID,
          opponent: b.opponent || 'Unknown Match',
          match_date: b.match_date || null,
          match_status: b.match_status || 'unknown',
          bookings: [],
          totalRevenue: 0,
          totalTickets: 0,
        };
      }
      grouped[key].bookings.push(b);
      grouped[key].totalRevenue += parseFloat(b.total_amount || 0);
      grouped[key].totalTickets += parseInt(b.quantity || 0, 10);
    });
    return Object.values(grouped).sort((a, b) => {
      if (a.match_date && b.match_date) return new Date(b.match_date) - new Date(a.match_date);
      if (a.match_date && !b.match_date) return -1;
      if (!a.match_date && b.match_date) return 1;
      return 0;
    });
  };

  const toggleMatchExpand = (key) => {
    setExpandedMatches(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ----- Revenue derived data -----
  const revenueSummary = revenueData?.summary || [];
  const revenueTotals = revenueData?.totals || {};
  const getRevenueBySource = (source) => {
    const item = revenueSummary.find(r => r.source === source);
    return item ? parseFloat(item.total_amount || 0) : 0;
  };
  const ticketRevenue = getRevenueBySource('tickets');
  const merchandiseRevenue = getRevenueBySource('merchandise');
  const sponsorshipRevenue = getRevenueBySource('sponsorship');
  const otherRevenue = getRevenueBySource('other');
  const membershipRevenue = membershipRevenueFromMemberships;
  const totalRevenue = revenueTotals.grand_total || (ticketRevenue + merchandiseRevenue + membershipRevenue + sponsorshipRevenue + otherRevenue);
  const pct = (val) => (totalRevenue > 0 ? ((val / totalRevenue) * 100).toFixed(1) : '0.0');
  const revenueBreakdown = [
    { source: 'Ticket Sales', amount: ticketRevenue, percentage: pct(ticketRevenue) },
    { source: 'Merchandise', amount: merchandiseRevenue, percentage: pct(merchandiseRevenue) },
    { source: 'Memberships', amount: membershipRevenue, percentage: pct(membershipRevenue) },
    { source: 'Sponsorships', amount: sponsorshipRevenue, percentage: pct(sponsorshipRevenue) },
    { source: 'Other Income', amount: otherRevenue, percentage: pct(otherRevenue) },
  ];
  const memberCount = membershipFee > 0 ? Math.floor(membershipRevenue / membershipFee) : 0;
  const matchSalesRows = revenueByMatch.length > 0
    ? revenueByMatch.map(r => ({
        label: r.opponent ? `vs ${r.opponent}` : `Match #${r.matchID}`,
        vip: r.vip_tickets || 0,
        regular: r.regular_tickets || 0,
        student: r.student_tickets || 0,
        total: parseFloat(r.total_revenue || 0),
      }))
    : Object.entries(bookings.reduce((acc, b) => {
        const key = b.opponent ? `vs ${b.opponent}` : `Match #${b.matchID}`;
        if (!acc[key]) acc[key] = { vip: 0, regular: 0, student: 0, total: 0 };
        acc[key][b.ticket_type] = (acc[key][b.ticket_type] || 0) + parseInt(b.quantity || 0, 10);
        acc[key].total += parseFloat(b.total_amount || 0);
        return acc;
      }, {})).map(([label, s]) => ({ label, ...s }));

  // ----- UseEffect -----
  useEffect(() => {
    const init = async () => {
      const userData = await authStorage.getUser();
      if (userData) {
        setUser(userData);
        if (userData.role === 'admin' || userData.role === 'super_admin') {
          await loadDashboardData();
        } else if (userData.role === 'editor') {
          await loadNews();
        }
      }
      setAuthChecking(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    switch (activeTab) {
      case 'players-manage': loadPlayers(); break;
      case 'stats-update': 
        loadPlayers();
        loadMatches();
        break;
      case 'match-results':
      case 'add-match': loadMatches(); break;
      case 'add-news': loadNews(); break;
      case 'bookings': loadBookings(); break;
      case 'gallery': loadGallery(); break;
      case 'comments': loadComments(); break;
      case 'polls': loadPolls(); break;
      case 'manage-admins': loadAdmins(); break;
      case 'settings': loadSettings(); break;
      case 'revenue':
        loadDashboardData();
        loadBookings();
        loadRevenueByMatch();
        loadRevenueData();
        loadMembershipRevenue();
        break;
      default: break;
    }
  }, [activeTab, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (user?.role === 'admin' || user?.role === 'super_admin') loadDashboardData();
    switch (activeTab) {
      case 'players-manage': loadPlayers(); break;
      case 'stats-update':
        loadPlayers();
        loadMatches();
        break;
      case 'match-results':
      case 'add-match': loadMatches(); break;
      case 'add-news': loadNews(); break;
      case 'bookings': loadBookings(); break;
      case 'gallery': loadGallery(); break;
      case 'comments': loadComments(); break;
      case 'polls': loadPolls(); break;
      case 'manage-admins': loadAdmins(); break;
      case 'settings': loadSettings(); break;
      case 'revenue':
        loadDashboardData();
        loadBookings();
        loadRevenueByMatch();
        loadRevenueData();
        loadMembershipRevenue();
        break;
      default: break;
    }
    setTimeout(() => setRefreshing(false), 1500);
  }, [activeTab, user]);

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => onLogout && onLogout() },
    ]);
  };

  if (authChecking) {
    return (
      <LinearGradient colors={BG} style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Verifying session...</Text>
      </LinearGradient>
    );
  }

  // Helper for topPerformers, recentResults, pendingMatches
  const topPerformers = [...players].sort((a,b) => (b.goals||0)-(a.goals||0)).slice(0,5);
  const recentResults = matches.filter(m => m.status === 'completed').slice(0,5);
  const pendingMatches = matches.filter(m => m.status === 'upcoming' || m.status === 'live');

  // ========== RENDER ==========
  return (
    <LinearGradient colors={BG} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.nav}>
        <View style={styles.navContainer}>
          <Text style={styles.logo}>FC INKIWANJANI</Text>
          <View style={styles.navActions}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{user?.role?.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <TouchableOpacity
              onPress={async () => navigation.navigate('Reports', { token: await authStorage.getToken(), user })}
              style={styles.reportsBtn}
            >
              <Text style={styles.reportsBtnText}>REPORTS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutBtnText}>LOG OUT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Notification message={notification.message} type={notification.type} visible={notification.visible} onHide={hideNotification} />
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />}
      >
        <View style={styles.mainContainer}>
          <View style={styles.pageHeader}>
            <Text style={styles.sectionTitle}>ADMIN DASHBOARD</Text>
            <View style={styles.sectionTitleBar} />
          </View>
          <Text style={styles.welcomeText}>Welcome, {user?.full_name}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
            {TABS_BY_ROLE[user?.role]?.map(tab => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              >
                <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ===== REVENUE TAB ===== */}
          {activeTab === 'revenue' && (
            <View>
              <View style={styles.card}>
                <SectionHeading label="OVERVIEW" />
                <View style={styles.statsGrid}>
                  {[
                    { label: 'Total Revenue', value: formatKES(totalRevenue), sub: 'All sources' },
                    { label: 'Ticket Sales', value: formatKES(ticketRevenue), sub: `${revenueTotals.total_transactions || 0} transactions` },
                    { label: 'Merchandise', value: formatKES(merchandiseRevenue), sub: 'Recorded sales' },
                    { label: 'Sponsorships', value: formatKES(sponsorshipRevenue), sub: 'Total received' },
                    { label: 'Membership Fees', value: formatKES(membershipRevenue), sub: `${memberCount} est. members` },
                    { label: 'Other Income', value: formatKES(otherRevenue), sub: 'Miscellaneous' },
                  ].map((item, i) => (
                    <View key={i} style={styles.statCard}>
                      <Text style={styles.statLabel}>{item.label}</Text>
                      <Text style={styles.statValue}>{item.value}</Text>
                      <Text style={styles.statSub}>{item.sub}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.card}>
                <SectionHeading label="REVENUE BREAKDOWN" />
                <View style={styles.table}>
                  <TableHeader cols={[{ label: 'Source', flex: 2 }, { label: 'Amount (KES)', flex: 2 }, { label: 'Share', flex: 1 }]} />
                  {revenueBreakdown.map((item, i) => (
                    <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{item.source}</Text>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{formatKES(item.amount)}</Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>{item.percentage}%</Text>
                    </View>
                  ))}
                  <View style={[styles.tableRow, styles.tableRowTotal]}>
                    <Text style={[styles.tableCellBold, { flex: 2 }]}>TOTAL</Text>
                    <Text style={[styles.tableCellBold, { flex: 2 }]}>{formatKES(totalRevenue)}</Text>
                    <Text style={[styles.tableCellBold, { flex: 1 }]}>100%</Text>
                  </View>
                </View>
              </View>
              <View style={styles.card}>
                <SectionHeading label="TICKET SALES BY MATCH" />
                <View style={styles.table}>
                  <TableHeader cols={[{ label: 'Match', flex: 2 }, { label: 'VIP', flex: 0.7 }, { label: 'Reg', flex: 0.9 }, { label: 'Std', flex: 0.9 }, { label: 'Total (KES)', flex: 1.5 }]} />
                  {matchSalesRows.length > 0 ? matchSalesRows.map((row, i) => (
                    <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                      <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{row.label}</Text>
                      <Text style={[styles.tableCell, { flex: 0.7 }]}>{row.vip}</Text>
                      <Text style={[styles.tableCell, { flex: 0.9 }]}>{row.regular}</Text>
                      <Text style={[styles.tableCell, { flex: 0.9 }]}>{row.student}</Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatKES(row.total)}</Text>
                    </View>
                  )) : (
                    <View style={styles.tableRow}><Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>No ticket sales recorded</Text></View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* ===== PLAYERS TAB ===== */}
          {activeTab === 'players-manage' && (
            <>
              <View style={styles.card}>
                <SectionHeading label="ADD PLAYER" />
                <FormGroup label="PLAYER NAME *">
                  <TextInput style={styles.input} value={newPlayer.name} onChangeText={t => setNewPlayer({ ...newPlayer, name: t })} placeholder="Full name" placeholderTextColor={COLORS.textDim} />
                </FormGroup>
                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <FormGroup label="JERSEY NO. *">
                      <TextInput style={styles.input} value={newPlayer.jersey_number} onChangeText={t => setNewPlayer({ ...newPlayer, jersey_number: t })} placeholder="1–99" keyboardType="numeric" />
                    </FormGroup>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <FormGroup label="AGE *">
                      <TextInput style={styles.input} value={newPlayer.age} onChangeText={t => setNewPlayer({ ...newPlayer, age: t })} placeholder="15–55" keyboardType="numeric" />
                    </FormGroup>
                  </View>
                </View>
                <FormGroup label="POSITION *">
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={newPlayer.position} onValueChange={v => setNewPlayer({ ...newPlayer, position: v })} style={styles.picker}>
                      <Picker.Item label="Select position..." value="" />
                      <Picker.Item label="Goalkeeper" value="goalkeeper" />
                      <Picker.Item label="Defender" value="defender" />
                      <Picker.Item label="Midfielder" value="midfielder" />
                      <Picker.Item label="Forward" value="forward" />
                    </Picker>
                  </View>
                </FormGroup>
                <TouchableOpacity style={styles.btnPrimary} onPress={addPlayer}><Text style={styles.btnText}>ADD TO SQUAD</Text></TouchableOpacity>
              </View>
              <View style={styles.card}>
                <SectionHeading label={`CURRENT SQUAD (${players.length})`} />
                {loadingPlayers ? <ActivityIndicator color={COLORS.gold} /> : players.length > 0 ? (
                  <View style={styles.table}>
                    <TableHeader cols={[{ label: '#', flex: 0.5 }, { label: 'Name', flex: 2 }, { label: 'Position', flex: 1.5 }, { label: 'Age', flex: 0.5 }, { label: 'Gls', flex: 0.6 }, { label: 'Action', flex: 1.2 }]} />
                    {players.map((p, i) => (
                      <View key={p.playerID} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                        <Text style={[styles.tableCell, { flex: 0.5 }]}>{p.jersey_number}</Text>
                        <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{p.name}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>{p.position}</Text>
                        <Text style={[styles.tableCell, { flex: 0.5 }]}>{p.age}</Text>
                        <Text style={[styles.tableCell, { flex: 0.6 }]}>{p.goals || 0}</Text>
                        <TouchableOpacity style={[styles.btnDanger, { flex: 1.2 }]} onPress={() => removePlayer(p.playerID, p.name)}>
                          <Text style={styles.btnDangerText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : <Text style={styles.noDataText}>No players in squad yet.</Text>}
              </View>
            </>
          )}

          {/* ===== STATS UPDATE TAB (WIZARD STYLE) ===== */}
          {activeTab === 'stats-update' && (
            <View style={styles.card}>
              <SectionHeading label="UPDATE PLAYER STATS (POST‑MATCH)" />
              
              {/* Step 0: Select Match */}
              <FormGroup label="SELECT MATCH">
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedMatchId}
                    onValueChange={handleSelectMatch}
                    style={styles.picker}
                  >
                    <Picker.Item label="-- Choose a completed match --" value="" />
                    {matches.filter(m => m.status === 'completed').map(m => (
                      <Picker.Item
                        key={m.matchID}
                        label={`${new Date(m.match_date).toLocaleDateString('en-KE')} — ${m.opponent} (${m.venue === 'home' ? 'H' : 'A'})`}
                        value={m.matchID.toString()}
                      />
                    ))}
                  </Picker>
                </View>
              </FormGroup>

              {selectedMatchId !== '' && (
                <>
                  {/* Step 1: Appearance */}
                  {step === 1 && (
                    <>
                      <Text style={styles.stepTitle}>Step 1: Who played in this match?</Text>
                      <Text style={styles.hintText}>Select all players who made an appearance.</Text>
                      <ScrollView style={{ maxHeight: 300 }}>
                        {players.map(player => (
                          <TouchableOpacity
                            key={player.playerID}
                            style={[styles.playerCheckbox, appearancePlayers[player.playerID] && styles.playerCheckboxSelected]}
                            onPress={() => togglePlayerAppearance(player.playerID)}
                          >
                            <Text style={styles.playerCheckboxText}>
                              #{player.jersey_number} {player.name} ({player.position})
                            </Text>
                            {appearancePlayers[player.playerID] && <Text style={styles.checkmark}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.btnPrimary} onPress={goToNextStep}>
                          <Text style={styles.btnText}>NEXT: GOALS →</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Step 2: Goals */}
                  {step === 2 && (
                    <>
                      <Text style={styles.stepTitle}>Step 2: Goals scored</Text>
                      <Text style={styles.hintText}>Enter goals for each player who played.</Text>
                      {getAppearanceList().map(playerId => {
                        const player = players.find(p => p.playerID.toString() === playerId);
                        if (!player) return null;
                        return (
                          <View key={playerId} style={styles.statRow}>
                            <Text style={styles.statPlayerName}>#{player.jersey_number} {player.name}</Text>
                            <TextInput
                              style={styles.statInputSmall}
                              value={goalsData[playerId] !== undefined ? String(goalsData[playerId]) : '0'}
                              onChangeText={val => updatePlayerStat(playerId, 'goals', val)}
                              keyboardType="numeric"
                              placeholder="0"
                            />
                            <Text style={styles.statLabel}>goals</Text>
                          </View>
                        );
                      })}
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.btnSecondary} onPress={goToPrevStep}>
                          <Text style={styles.btnSecondaryText}>← BACK</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnPrimary} onPress={goToNextStep}>
                          <Text style={styles.btnText}>NEXT: ASSISTS →</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Step 3: Assists */}
                  {step === 3 && (
                    <>
                      <Text style={styles.stepTitle}>Step 3: Assists</Text>
                      <Text style={styles.hintText}>Enter assists for each player who played.</Text>
                      {getAppearanceList().map(playerId => {
                        const player = players.find(p => p.playerID.toString() === playerId);
                        if (!player) return null;
                        return (
                          <View key={playerId} style={styles.statRow}>
                            <Text style={styles.statPlayerName}>#{player.jersey_number} {player.name}</Text>
                            <TextInput
                              style={styles.statInputSmall}
                              value={assistsData[playerId] !== undefined ? String(assistsData[playerId]) : '0'}
                              onChangeText={val => updatePlayerStat(playerId, 'assists', val)}
                              keyboardType="numeric"
                              placeholder="0"
                            />
                            <Text style={styles.statLabel}>assists</Text>
                          </View>
                        );
                      })}
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.btnSecondary} onPress={goToPrevStep}>
                          <Text style={styles.btnSecondaryText}>← BACK</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnPrimary} onPress={goToNextStep}>
                          <Text style={styles.btnText}>NEXT: CARDS →</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Step 4: Cards */}
                  {step === 4 && (
                    <>
                      <Text style={styles.stepTitle}>Step 4: Disciplinary cards</Text>
                      <Text style={styles.hintText}>Enter yellow and red cards for each player.</Text>
                      {getAppearanceList().map(playerId => {
                        const player = players.find(p => p.playerID.toString() === playerId);
                        if (!player) return null;
                        return (
                          <View key={playerId} style={styles.cardRow}>
                            <Text style={styles.statPlayerName}>#{player.jersey_number} {player.name}</Text>
                            <View style={styles.cardInputGroup}>
                              <TextInput
                                style={styles.cardInput}
                                value={yellowCardsData[playerId] !== undefined ? String(yellowCardsData[playerId]) : '0'}
                                onChangeText={val => updatePlayerStat(playerId, 'yellow', val)}
                                keyboardType="numeric"
                                placeholder="0"
                              />
                              <Text style={styles.cardLabel}>Y</Text>
                              <TextInput
                                style={styles.cardInput}
                                value={redCardsData[playerId] !== undefined ? String(redCardsData[playerId]) : '0'}
                                onChangeText={val => updatePlayerStat(playerId, 'red', val)}
                                keyboardType="numeric"
                                placeholder="0"
                              />
                              <Text style={styles.cardLabel}>R</Text>
                            </View>
                          </View>
                        );
                      })}
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.btnSecondary} onPress={goToPrevStep}>
                          <Text style={styles.btnSecondaryText}>← BACK</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnPrimary} onPress={goToNextStep}>
                          <Text style={styles.btnText}>REVIEW & SAVE →</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Step 5: Review and Save */}
                  {step === 5 && (
                    <>
                      <Text style={styles.stepTitle}>Step 5: Review and Save</Text>
                      <ScrollView style={{ maxHeight: 300 }}>
                        {getAppearanceList().map(playerId => {
                          const player = players.find(p => p.playerID.toString() === playerId);
                          if (!player) return null;
                          return (
                            <View key={playerId} style={styles.reviewRow}>
                              <Text style={styles.reviewPlayerName}>{player.name}</Text>
                              <Text style={styles.reviewStats}>
                                G:{goalsData[playerId] || 0}  A:{assistsData[playerId] || 0}  Y:{yellowCardsData[playerId] || 0}  R:{redCardsData[playerId] || 0}
                              </Text>
                            </View>
                          );
                        })}
                      </ScrollView>
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.btnSecondary} onPress={goToPrevStep}>
                          <Text style={styles.btnSecondaryText}>← BACK</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btnPrimary, savingStats && styles.btnDisabled]} onPress={saveAllStats} disabled={savingStats}>
                          {savingStats ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.btnText}>SAVE ALL STATS</Text>}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Reset button */}
                  <TouchableOpacity style={styles.btnSecondary} onPress={resetStatsWizard}>
                    <Text style={styles.btnSecondaryText}>CANCEL / START OVER</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ===== MATCH RESULTS TAB ===== */}
          {activeTab === 'match-results' && (
            <>
              <View style={styles.card}>
                <SectionHeading label="RECORD RESULT" />
                {loadingMatches ? <ActivityIndicator color={COLORS.gold} /> : pendingMatches.length > 0 ? (
                  <>
                    <FormGroup label="SELECT MATCH *">
                      <View style={styles.pickerWrapper}>
                        <Picker selectedValue={matchResult.matchId} onValueChange={v => setMatchResult({ ...matchResult, matchId: v })} style={styles.picker}>
                          <Picker.Item label="Choose a match..." value="" />
                          {pendingMatches.map(m => <Picker.Item key={m.matchID} label={`${new Date(m.match_date).toLocaleDateString('en-KE')} — vs ${m.opponent} (${m.venue})`} value={m.matchID.toString()} />)}
                        </Picker>
                      </View>
                    </FormGroup>
                    <View style={styles.formRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <FormGroup label="HOME TEAM *">
                          <TextInput style={styles.input} value={matchResult.home_score} onChangeText={t => setMatchResult({ ...matchResult, home_score: t })} keyboardType="numeric" placeholder="0" />
                        </FormGroup>
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <FormGroup label="AWAY TEAM *">
                          <TextInput style={styles.input} value={matchResult.away_score} onChangeText={t => setMatchResult({ ...matchResult, away_score: t })} keyboardType="numeric" placeholder="0" />
                        </FormGroup>
                      </View>
                    </View>
                    <FormGroup label="MATCH SUMMARY">
                      <TextInput style={[styles.input, styles.textarea]} value={matchResult.summary} onChangeText={t => setMatchResult({ ...matchResult, summary: t })} multiline numberOfLines={4} placeholder="Brief match report..." />
                    </FormGroup>
                    <FormGroup label="ATTENDANCE">
                      <TextInput style={styles.input} value={matchResult.attendance} onChangeText={t => setMatchResult({ ...matchResult, attendance: t })} keyboardType="numeric" placeholder="Number of fans" />
                    </FormGroup>
                    <TouchableOpacity style={styles.btnPrimary} onPress={updateMatchResult}><Text style={styles.btnText}>SAVE RESULT</Text></TouchableOpacity>
                  </>
                ) : <Text style={styles.noDataText}>No upcoming matches. Schedule matches in the Matches tab first.</Text>}
              </View>
              {recentResults.length > 0 && (
                <View style={styles.card}>
                  <SectionHeading label="RECENT RESULTS" />
                  {recentResults.map((m) => {
                    const isHome = m.venue === 'home';
                    const ourScore = isHome ? m.home_score : m.away_score;
                    const theirScore = isHome ? m.away_score : m.home_score;
                    const outcome = ourScore > theirScore ? 'WIN' : ourScore < theirScore ? 'LOSS' : 'DRAW';
                    const outcomeColor = outcome === 'WIN' ? COLORS.gold : outcome === 'LOSS' ? COLORS.dangerText : COLORS.textPrimary;
                    const scoreLine = isHome ? `FC Inkiwanjani ${ourScore}–${theirScore} ${m.opponent}` : `${m.opponent} ${theirScore}–${ourScore} FC Inkiwanjani`;
                    return (
                      <View key={m.matchID} style={styles.resultCard}>
                        <View style={styles.resultCardHeader}>
                          <Text style={styles.resultTitle}>{scoreLine}</Text>
                          <Text style={[styles.resultOutcome, { color: outcomeColor }]}>{outcome}</Text>
                        </View>
                        <Text style={styles.resultMeta}>{new Date(m.match_date).toLocaleDateString('en-KE')}  ·  {String(m.competition || '').toUpperCase()}  ·  {isHome ? 'Home' : 'Away'}{m.attendance ? `  ·  ${m.attendance.toLocaleString()} fans` : ''}</Text>
                        {m.summary && <Text style={styles.resultSummary}>{m.summary}</Text>}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ===== ADD MATCH TAB ===== */}
          {activeTab === 'add-match' && (
            <View style={styles.card}>
              <SectionHeading label="SCHEDULE MATCH" />
              <FormGroup label="OPPONENT *">
                <TextInput style={styles.input} value={newMatch.opponent} onChangeText={t => setNewMatch({ ...newMatch, opponent: t })} placeholder="e.g. Rift Valley FC" />
              </FormGroup>
              <FormGroup label="DATE & TIME *  (YYYY-MM-DD HH:MM:SS)">
                <TextInput style={styles.input} value={newMatch.match_date} onChangeText={t => setNewMatch({ ...newMatch, match_date: t })} placeholder="e.g. 2025-12-25 15:00:00" />
              </FormGroup>
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FormGroup label="VENUE *">
                    <View style={styles.pickerWrapper}>
                      <Picker selectedValue={newMatch.venue} onValueChange={v => setNewMatch({ ...newMatch, venue: v })} style={styles.picker}>
                        <Picker.Item label="Home" value="home" />
                        <Picker.Item label="Away" value="away" />
                      </Picker>
                    </View>
                  </FormGroup>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <FormGroup label="COMPETITION *">
                    <View style={styles.pickerWrapper}>
                      <Picker selectedValue={newMatch.competition} onValueChange={v => setNewMatch({ ...newMatch, competition: v })} style={styles.picker}>
                        <Picker.Item label="League" value="league" />
                        <Picker.Item label="Cup" value="cup" />
                        <Picker.Item label="Friendly" value="friendly" />
                      </Picker>
                    </View>
                  </FormGroup>
                </View>
              </View>
              <TouchableOpacity style={styles.btnPrimary} onPress={addMatch}><Text style={styles.btnText}>SCHEDULE MATCH</Text></TouchableOpacity>
              {matches.length > 0 && (
                <>
                  <View style={[styles.sectionHeadingRow, { marginTop: 24 }]}>
                    <Text style={styles.sectionHeadingText}>ALL MATCHES</Text>
                    <View style={styles.sectionHeadingRule} />
                  </View>
                  {loadingMatches ? <ActivityIndicator color={COLORS.gold} /> : (
                    <View style={styles.table}>
                      <TableHeader cols={[{ label: 'Opponent', flex: 2 }, { label: 'Date', flex: 2 }, { label: 'Venue', flex: 1 }, { label: 'Status', flex: 1 }]} />
                      {matches.map((m, i) => (
                        <View key={m.matchID} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                          <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>vs {m.opponent}</Text>
                          <Text style={[styles.tableCell, { flex: 2 }]}>{new Date(m.match_date).toLocaleDateString('en-KE')}</Text>
                          <Text style={[styles.tableCell, { flex: 1 }]}>{m.venue}</Text>
                          <Text style={[styles.tableCell, { flex: 1, color: m.status === 'completed' ? COLORS.goldDark : m.status === 'live' ? COLORS.dangerText : COLORS.textPrimary }]}>{m.status}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* ===== NEWS TAB ===== */}
          {activeTab === 'add-news' && (
            <View style={styles.card}>
              <SectionHeading label="PUBLISH ARTICLE" />
              <FormGroup label="TITLE *">
                <TextInput style={styles.input} value={newNews.title} onChangeText={t => setNewNews({ ...newNews, title: t })} placeholder="Article title" />
              </FormGroup>
              <FormGroup label="CATEGORY *">
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={newNews.category} onValueChange={v => setNewNews({ ...newNews, category: v })} style={styles.picker}>
                    <Picker.Item label="Match Report" value="match-report" />
                    <Picker.Item label="Transfer News" value="transfer" />
                    <Picker.Item label="Club Announcement" value="announcement" />
                    <Picker.Item label="Community" value="community" />
                  </Picker>
                </View>
              </FormGroup>
              <FormGroup label="EXCERPT (OPTIONAL)">
                <TextInput style={[styles.input, { height: 64 }]} value={newNews.excerpt} onChangeText={t => setNewNews({ ...newNews, excerpt: t })} multiline placeholder="Short teaser — auto-generated if left empty" />
              </FormGroup>
              <FormGroup label="CONTENT *">
                <TextInput style={[styles.input, styles.textarea, { height: 160 }]} value={newNews.content} onChangeText={t => setNewNews({ ...newNews, content: t })} multiline numberOfLines={10} placeholder="Full article body..." />
              </FormGroup>
              <TouchableOpacity style={styles.btnPrimary} onPress={addNews}><Text style={styles.btnText}>PUBLISH ARTICLE</Text></TouchableOpacity>
              {newsArticles.length > 0 && (
                <>
                  <View style={[styles.sectionHeadingRow, { marginTop: 24 }]}>
                    <Text style={styles.sectionHeadingText}>RECENT ARTICLES ({newsArticles.length})</Text>
                    <View style={styles.sectionHeadingRule} />
                  </View>
                  {newsArticles.slice(0, 5).map((article) => (
                    <View key={article.newsID} style={styles.resultCard}>
                      <Text style={styles.resultTitle}>{article.title}</Text>
                      <Text style={styles.resultMeta}>{article.category.toUpperCase()}  ·  {new Date(article.published_date).toLocaleDateString('en-KE')}  ·  {article.views || 0} views</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* ===== BOOKINGS TAB ===== */}
          {activeTab === 'bookings' && (
            <View style={styles.card}>
              <SectionHeading label={`TICKET BOOKINGS (${bookings.length})`} />
              {loadingBookings ? <ActivityIndicator color={COLORS.gold} /> : bookings.length > 0 ? (() => {
                const groupedMatches = groupBookingsByMatch();
                return groupedMatches.map((match, idx) => {
                  const matchKey = match.matchID || `unknown-${idx}`;
                  const isExpanded = expandedMatches[matchKey];
                  const matchDate = match.match_date ? new Date(match.match_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBA';
                  const matchStatusLabel = match.match_status ? String(match.match_status).toUpperCase() : 'UNKNOWN';
                  const matchStatusColor = match.match_status === 'upcoming' ? '#4A90D9' : match.match_status === 'completed' ? COLORS.gold : COLORS.textMuted;
                  const displayOpponent = match.opponent || 'Unknown Match';
                  return (
                    <View key={matchKey} style={styles.bookingMatchCard}>
                      <TouchableOpacity style={styles.bookingMatchHeader} onPress={() => toggleMatchExpand(matchKey)}>
                        <View style={styles.bookingMatchHeaderLeft}>
                          <Text style={styles.bookingMatchTitle}>{displayOpponent.startsWith('vs ') ? displayOpponent : `vs ${displayOpponent}`}</Text>
                          <Text style={styles.bookingMatchDate}>{matchDate}</Text>
                        </View>
                        <View style={styles.bookingMatchHeaderRight}>
                          <View style={[styles.statusPill, { backgroundColor: matchStatusColor + '22' }]}><Text style={[styles.statusPillText, { color: matchStatusColor }]}>{matchStatusLabel}</Text></View>
                          <View style={styles.bookingMatchStats}><Text style={styles.bookingMatchStat}>{match.totalTickets}🎫</Text><Text style={styles.bookingMatchStat}>{formatKES(match.totalRevenue)}</Text></View>
                          <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                        </View>
                      </TouchableOpacity>
                      {isExpanded && (
                        <View style={styles.bookingMatchDetails}>
                          {match.bookings.map((b) => {
                            const paymentStatusColor = b.payment_status === 'paid' ? COLORS.gold : b.payment_status === 'cancelled' ? COLORS.dangerText : COLORS.textPrimary;
                            return (
                              <View key={b.bookingID} style={styles.bookingItem}>
                                <View style={styles.bookingItemHeader}>
                                  <View><Text style={styles.bookingRef}>{b.booking_reference || `#${b.bookingID}`}</Text><Text style={styles.bookingInfo}>{b.customer_name} · {b.customer_email}</Text></View>
                                  <View style={[styles.statusPill, { backgroundColor: b.payment_status === 'paid' ? '#1A3A1A' : b.payment_status === 'cancelled' ? COLORS.danger : '#2A2A2A' }]}><Text style={[styles.statusPillText, { color: paymentStatusColor }]}>{String(b.payment_status || '').toUpperCase()}</Text></View>
                                </View>
                                <View style={styles.bookingItemFooter}>
                                  <Text style={styles.bookingTickets}>{b.quantity}× {String(b.ticket_type || '').toUpperCase()}</Text>
                                  <Text style={styles.bookingAmount}>{formatKES(b.total_amount)}</Text>
                                  <Text style={styles.bookingDate}>{new Date(b.booking_date).toLocaleString('en-KE')}</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                });
              })() : <Text style={styles.noDataText}>No bookings recorded yet.</Text>}
            </View>
          )}

          {/* ===== GALLERY TAB ===== */}
          {activeTab === 'gallery' && (
            <>
              <View style={styles.card}>
                <SectionHeading label="UPLOAD PHOTO" />
                <FormGroup label="TITLE"><TextInput style={styles.input} value={galleryTitle} onChangeText={setGalleryTitle} placeholder="e.g. Match day celebration" /></FormGroup>
                <FormGroup label="DESCRIPTION (OPTIONAL)"><TextInput style={[styles.input, { height: 64 }]} value={galleryDesc} onChangeText={setGalleryDesc} multiline placeholder="Brief description" /></FormGroup>
                <FormGroup label="MATCH ID (OPTIONAL)"><TextInput style={styles.input} value={galleryMatchID} onChangeText={setGalleryMatchID} keyboardType="numeric" placeholder="e.g. 1" /></FormGroup>
                <FormGroup label="PHOTO ORIENTATION">
                  <View style={styles.orientationButtons}>
                    {[{ label: '📷 4:3', value: '4:3' }, { label: '🖼️ 16:9', value: '16:9' }, { label: '📱 9:16', value: '9:16' }].map(opt => (
                      <TouchableOpacity key={opt.value} style={[styles.orientationButton, galleryAspectRatio === opt.value && styles.orientationButtonActive]} onPress={() => setGalleryAspectRatio(opt.value)}>
                        <Text style={[styles.orientationButtonText, galleryAspectRatio === opt.value && styles.orientationButtonTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </FormGroup>
                <TouchableOpacity style={[styles.btnSecondary, { marginBottom: 12 }]} onPress={pickImage}><Text style={styles.btnSecondaryText}>{galleryImageUri ? 'CHANGE PHOTO' : 'SELECT PHOTO'}</Text></TouchableOpacity>
                {galleryImageUri && (
                  <View style={{ marginBottom: 12 }}>
                    <Image source={{ uri: galleryImageUri }} style={[styles.galleryPreviewImage, { aspectRatio: galleryAspectRatio === '16:9' ? 16/9 : galleryAspectRatio === '9:16' ? 9/16 : 4/3 }]} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setGalleryImageUri(null)}><Text style={styles.removeImageText}>Remove</Text></TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity style={styles.btnPrimary} onPress={uploadGalleryImage}><Text style={styles.btnText}>UPLOAD PHOTO</Text></TouchableOpacity>
              </View>
              <View style={styles.card}>
                <SectionHeading label={`GALLERY PHOTOS (${galleryItems.length})`} />
                {loadingGallery ? <ActivityIndicator color={COLORS.gold} /> : galleryItems.length > 0 ? (
                  <View style={styles.table}>
                    <TableHeader cols={[{ label: 'Title', flex: 2 }, { label: 'Match ID', flex: 1 }, { label: 'Date', flex: 1.5 }, { label: 'Action', flex: 1 }]} />
                    {galleryItems.map((item, i) => (
                      <View key={item.galleryID} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                        <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                        <Text style={[styles.tableCell, { flex: 1 }]}>{item.matchID || '—'}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>{new Date(item.upload_date).toLocaleDateString('en-KE')}</Text>
                        <TouchableOpacity style={[styles.btnDanger, { flex: 1 }]} onPress={() => deleteGalleryItem(item.galleryID)}>
                          <Text style={styles.btnDangerText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : <Text style={styles.noDataText}>No photos in gallery yet.</Text>}
              </View>
            </>
          )}

          {/* ===== COMMENTS TAB (only approve/unapprove) ===== */}
          {activeTab === 'comments' && (
            <View style={styles.card}>
              <SectionHeading label={`COMMENTS MODERATION (${comments.length})`} />
              {loadingComments ? <ActivityIndicator color={COLORS.gold} /> : comments.length > 0 ? comments.map(comment => (
                <View key={comment.commentID} style={styles.commentAdminCard}>
                  <View style={styles.commentAdminHeader}>
                    <Text style={styles.commentAdminName}>{comment.commenter_name || 'Anonymous'}</Text>
                    <View style={[styles.statusPill, { backgroundColor: comment.is_approved ? '#1A3A1A' : COLORS.danger }]}>
                      <Text style={[styles.statusPillText, { color: comment.is_approved ? '#4CAF50' : COLORS.dangerText }]}>{comment.is_approved ? 'APPROVED' : 'PENDING'}</Text>
                    </View>
                  </View>
                  <Text style={styles.commentAdminText}>{comment.comment_text || ''}</Text>
                  <Text style={styles.commentAdminDate}>{comment.created_at ? new Date(comment.created_at).toLocaleString('en-KE') : '—'}{comment.userID ? `  ·  User #${comment.userID}` : '  ·  Guest'}</Text>
                  <View style={styles.commentAdminActions}>
                    <TouchableOpacity style={[styles.btnSmallSecondary, { marginRight: 8 }]} onPress={() => toggleCommentApproval(comment.commentID)}>
                      <Text style={styles.btnSmallSecondaryText}>{comment.is_approved ? 'UNAPPROVE' : 'APPROVE'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )) : <Text style={styles.noDataText}>No comments recorded yet.</Text>}
            </View>
          )}

          {/* ===== POLLS TAB ===== */}
          {activeTab === 'polls' && (
            <>
              <View style={styles.card}>
                <SectionHeading label="CREATE NEW POLL" />
                <FormGroup label="QUESTION *"><TextInput style={styles.input} value={pollQuestion} onChangeText={setPollQuestion} placeholder="e.g. Who should be Player of the Month?" /></FormGroup>
                <Text style={styles.pollHintText}>Tip: Select 2 or more players from the squad to be poll options. Fans will vote for their favorite.</Text>
                <FormGroup label="SELECT PLAYERS (AT LEAST 2) *">
                  {players.length > 0 ? (
                    <ScrollView style={styles.playerSelector} horizontal={false}>
                      {players.map(player => {
                        const isSelected = selectedPollPlayers.includes(player.playerID.toString());
                        return (
                          <TouchableOpacity key={player.playerID} style={[styles.playerChip, isSelected && styles.playerChipSelected]} onPress={() => togglePollPlayer(player.playerID)}>
                            <Text style={[styles.playerChipText, isSelected && styles.playerChipTextSelected]}>#{player.jersey_number} {player.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : <Text style={styles.noDataText}>No players available. Add players first.</Text>}
                </FormGroup>
                {selectedPollPlayers.length > 0 && <Text style={styles.selectedCount}>{selectedPollPlayers.length} player{selectedPollPlayers.length !== 1 ? 's' : ''} selected</Text>}
                <TouchableOpacity style={styles.btnPrimary} onPress={createPoll}><Text style={styles.btnText}>CREATE POLL</Text></TouchableOpacity>
              </View>
              <View style={styles.card}>
                <SectionHeading label={`ALL POLLS (${polls.length})`} />
                {loadingPolls ? <ActivityIndicator color={COLORS.gold} /> : polls.length > 0 ? polls.map(poll => {
                  const totalVotes = poll.players ? poll.players.reduce((sum, p) => sum + Number(p.vote_count || 0), 0) : 0;
                  const topVoter = poll.players && poll.players.length > 0 ? poll.players[0] : null;
                  return (
                    <View key={poll.pollID} style={styles.pollAdminCard}>
                      <View style={styles.pollAdminHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pollQuestionText}>{poll.question}</Text>
                          <Text style={styles.pollMetaText}>{poll.admin_name || 'Admin'}  ·  {new Date(poll.created_at).toLocaleDateString('en-KE')}  ·  {totalVotes} vote{totalVotes !== 1 ? 's' : ''}</Text>
                          <View style={styles.pollStatusRow}>
                            <View style={[styles.statusPill, { backgroundColor: poll.is_active ? '#1A3A1A' : COLORS.darkSurface }]}>
                              <Text style={[styles.statusPillText, { color: poll.is_active ? '#4CAF50' : COLORS.textMuted }]}>{poll.is_active ? 'ACTIVE' : 'INACTIVE'}</Text>
                            </View>
                            {topVoter && <Text style={styles.topVoterText}>Leading: {topVoter.name} ({topVoter.vote_count} votes)</Text>}
                          </View>
                        </View>
                      </View>
                      {poll.players && poll.players.length > 0 && (
                        <View style={styles.pollVoteList}>
                          {poll.players.map(p => {
                            const pct = totalVotes > 0 ? Math.round((Number(p.vote_count || 0) / totalVotes) * 100) : 0;
                            return (
                              <View key={p.playerID} style={styles.pollVoteRow}>
                                <Text style={styles.pollVoteName}>{p.name}</Text>
                                <Text style={styles.pollVoteCount}>{p.vote_count} ({pct}%)</Text>
                                <View style={styles.pollVoteBar}><View style={[styles.pollVoteFill, { width: `${pct}%` }]} /></View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                      <View style={styles.commentAdminActions}>
                        {poll.is_active && (
                          <TouchableOpacity style={[styles.btnSmallSecondary, { marginRight: 8 }]} onPress={() => deactivatePoll(poll.pollID)}>
                            <Text style={styles.btnSmallSecondaryText}>DEACTIVATE</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.btnSmallDanger} onPress={() => deletePoll(poll.pollID)}>
                          <Text style={styles.btnSmallDangerText}>DELETE</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }) : <Text style={styles.noDataText}>No polls created yet.</Text>}
              </View>
            </>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === 'settings' && (
            <View style={styles.card}>
              <SectionHeading label="CLUB SETTINGS" />
              <View style={[styles.sectionHeadingRow, { marginBottom: 12 }]}>
                <Text style={styles.sectionHeadingText}>TICKET PRICES (KES)</Text>
                <View style={styles.sectionHeadingRule} />
              </View>
              <View style={styles.formRow}>
                {['vip', 'regular', 'student'].map((tier, i) => (
                  <View key={tier} style={{ flex: 1, marginHorizontal: i === 1 ? 8 : 0 }}>
                    <FormGroup label={tier.toUpperCase()}>
                      <TextInput style={styles.input} value={String(priceForm[tier])} onChangeText={t => setPriceForm({ ...priceForm, [tier]: t })} keyboardType="numeric" />
                    </FormGroup>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.btnPrimary} onPress={updateTicketPrices}><Text style={styles.btnText}>UPDATE TICKET PRICES</Text></TouchableOpacity>
              <View style={[styles.sectionHeadingRow, { marginTop: 24, marginBottom: 12 }]}>
                <Text style={styles.sectionHeadingText}>MEMBERSHIP FEE (KES)</Text>
                <View style={styles.sectionHeadingRule} />
              </View>
              <View style={styles.feeCurrentRow}><Text style={styles.feeCurrentLabel}>Current fee</Text><Text style={styles.feeCurrentValue}>{formatKES(membershipFee)}</Text></View>
              <FormGroup label="NEW FEE"><TextInput style={styles.input} value={membershipFeeInput} onChangeText={setMembershipFeeInput} keyboardType="numeric" placeholder="e.g. 500" /></FormGroup>
              <TouchableOpacity style={styles.btnPrimary} onPress={updateMembershipFee}><Text style={styles.btnText}>UPDATE MEMBERSHIP FEE</Text></TouchableOpacity>
              {[
                { heading: 'RECORD MERCHANDISE SALES', amountValue: merchandiseAmount, amountSetter: setMerchandiseAmount, source: 'merchandise', label: 'RECORD MERCHANDISE' },
                { heading: 'RECORD SPONSORSHIP INCOME', amountValue: sponsorshipAmount, amountSetter: setSponsorshipAmount, descValue: sponsorshipDescription, descSetter: setSponsorshipDescription, source: 'sponsorship', label: 'RECORD SPONSORSHIP', descPlaceholder: 'e.g. Safaricom sponsorship Q1' },
                { heading: 'RECORD OTHER INCOME', amountValue: otherAmount, amountSetter: setOtherAmount, descValue: otherDescription, descSetter: setOtherDescription, source: 'other', label: 'RECORD OTHER INCOME', descPlaceholder: 'e.g. Training pitch hire' },
              ].map(({ heading, amountValue, amountSetter, descValue, descSetter, source, label, descPlaceholder }) => (
                <View key={source}>
                  <View style={[styles.sectionHeadingRow, { marginTop: 24, marginBottom: 12 }]}>
                    <Text style={styles.sectionHeadingText}>{heading}</Text>
                    <View style={styles.sectionHeadingRule} />
                  </View>
                  <FormGroup label="AMOUNT (KES)"><TextInput style={styles.input} value={amountValue} onChangeText={amountSetter} keyboardType="numeric" placeholder="e.g. 5000" /></FormGroup>
                  {descSetter && <FormGroup label="DESCRIPTION (OPTIONAL)"><TextInput style={styles.input} value={descValue} onChangeText={descSetter} placeholder={descPlaceholder} /></FormGroup>}
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => recordRevenue(source, amountValue, descValue)}><Text style={styles.btnText}>{label}</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* ===== ADMINS TAB ===== */}
          {activeTab === 'manage-admins' && user?.role === 'super_admin' && (
            <View style={styles.card}>
              <SectionHeading label="ADMIN TEAM" />
              {!showAdminForm ? (
                <TouchableOpacity style={[styles.btnPrimary, { marginBottom: 12 }]} onPress={() => setShowAdminForm(true)}><Text style={styles.btnText}>+ ADD NEW ADMIN</Text></TouchableOpacity>
              ) : (
                <View style={styles.adminForm}>
                  <View style={styles.adminFormHeader}>
                    <Text style={styles.adminFormTitle}>CREATE ADMIN ACCOUNT</Text>
                    <TouchableOpacity onPress={() => { setShowAdminForm(false); setNewAdminData({ full_name: '', username: '', email: '', password: '', role: 'admin' }); }}><Text style={styles.adminFormCancel}>CANCEL</Text></TouchableOpacity>
                  </View>
                  <FormGroup label="FULL NAME *"><TextInput style={styles.input} value={newAdminData.full_name} onChangeText={t => setNewAdminData({ ...newAdminData, full_name: t })} placeholder="Full name" /></FormGroup>
                  <FormGroup label="USERNAME *"><TextInput style={styles.input} value={newAdminData.username} onChangeText={t => setNewAdminData({ ...newAdminData, username: t })} placeholder="Username" autoCapitalize="none" /></FormGroup>
                  <FormGroup label="EMAIL ADDRESS *"><TextInput style={styles.input} value={newAdminData.email} onChangeText={t => setNewAdminData({ ...newAdminData, email: t })} placeholder="Email" keyboardType="email-address" autoCapitalize="none" /></FormGroup>
                  <FormGroup label="PASSWORD *"><TextInput style={styles.input} value={newAdminData.password} onChangeText={t => setNewAdminData({ ...newAdminData, password: t })} placeholder="Min 8 characters" secureTextEntry /></FormGroup>
                  <FormGroup label="ROLE *">
                    <View style={styles.pickerBox}>
                      <Picker selectedValue={newAdminData.role} onValueChange={v => setNewAdminData({ ...newAdminData, role: v })} style={styles.picker}>
                        <Picker.Item label="Editor" value="editor" />
                        <Picker.Item label="Admin" value="admin" />
                        <Picker.Item label="Super Admin" value="super_admin" />
                      </Picker>
                    </View>
                  </FormGroup>
                  <TouchableOpacity style={styles.btnPrimary} onPress={createAdmin}><Text style={styles.btnText}>CREATE ACCOUNT</Text></TouchableOpacity>
                </View>
              )}
              {loadingAdmins ? <ActivityIndicator color={COLORS.gold} style={{ marginTop: 16 }} /> : admins.length > 0 ? (
                <View style={styles.adminList}>
                  {admins.map((admin, i) => (
                    <View key={admin.adminUserID || i} style={[styles.adminRow, i % 2 === 1 && styles.tableRowAlt]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.adminName} numberOfLines={1}>{admin.full_name || admin.username || 'Unknown'}</Text>
                        <Text style={styles.adminMeta}>{admin.email || '—'} · {admin.username ? `@${admin.username}` : ''}</Text>
                      </View>
                      <View style={styles.adminRight}>
                        <View style={[styles.roleBadge, admin.role === 'super_admin' ? styles.roleBadgeSuper : admin.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeEditor]}>
                          <Text style={styles.roleBadgeText}>{(admin.role || '').toUpperCase()}</Text>
                        </View>
                        {admin.role !== 'super_admin' && (
                          <TouchableOpacity onPress={() => deleteAdmin(admin.adminUserID, admin.full_name || admin.username)} style={styles.deleteAdminBtn}>
                            <Text style={styles.deleteAdminBtnText}>DELETE</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyRow}><Text style={styles.emptyText}>No admin accounts found.</Text></View>
              )}
            </View>
          )}
        </View>
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerSection}><Text style={styles.footerHeading}>FC Inkiwanjani</Text><Text style={styles.footerText}>The Pride of Mile 46</Text><Text style={styles.footerText}>The Wolves</Text></View>
            <View style={styles.footerSection}><Text style={styles.footerHeading}>Contact</Text><Text style={styles.footerText}>Mile 46, Kajiado County</Text><Text style={styles.footerText}>info@fcinkiwanjani.com</Text><Text style={styles.footerText}>+254 748 234 887</Text></View>
          </View>
          <View style={styles.footerBottom}><Text style={styles.footerBottomText}>2026 FC Inkiwanjani. All rights reserved.</Text></View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// ----- Helper components (unchanged styles) -----
const SectionHeading = ({ label }) => (
  <View style={styles.sectionHeadingRow}>
    <Text style={styles.sectionHeadingText}>{label}</Text>
    <View style={styles.sectionHeadingRule} />
  </View>
);
const FormGroup = ({ label, children }) => (
  <View style={styles.formGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>{children}</View>
  </View>
);
const TableHeader = ({ cols }) => (
  <View style={styles.tableHeader}>
    {cols.map((col, i) => <Text key={i} style={[styles.tableHeaderText, { flex: col.flex }]}>{col.label}</Text>)}
  </View>
);

// ----- Extended styles for the new wizard -----
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: COLORS.navy },
  nav: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, marginHorizontal: 12, marginVertical: 8, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  navContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: 14, fontWeight: '900', color: COLORS.accent, letterSpacing: 0.5 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: { backgroundColor: COLORS.cardAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 3 },
  rolePillText: { color: COLORS.navy, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  reportsBtn: { backgroundColor: COLORS.accent, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  reportsBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 9, letterSpacing: 0.8 },
  logoutBtn: { borderWidth: 1, borderColor: COLORS.red + '60', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14, backgroundColor: COLORS.red + '10' },
  logoutBtnText: { color: COLORS.red, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  content: { flex: 1 },
  mainContainer: { padding: 16 },
  pageHeader: { marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: COLORS.navy, letterSpacing: 2 },
  sectionTitleBar: { width: 36, height: 2, backgroundColor: COLORS.accent, marginTop: 6, marginBottom: 4 },
  welcomeText: { fontSize: 12, color: COLORS.secText, marginBottom: 16 },
  tabScroll: { marginBottom: 16 },
  tabBtn: { paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, marginRight: 8, backgroundColor: COLORS.white },
  tabBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tabBtnText: { color: COLORS.navy, fontWeight: '700', fontSize: 11, letterSpacing: 0.8 },
  tabBtnTextActive: { color: COLORS.white },
  card: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionHeadingText: { fontSize: 11, fontWeight: '800', color: COLORS.accent, letterSpacing: 1.5, flexShrink: 0 },
  sectionHeadingRule: { flex: 1, height: 1, backgroundColor: COLORS.border },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  statCard: { backgroundColor: COLORS.card, padding: 12, borderRadius: 8, minWidth: 130, flex: 1, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  statLabel: { fontSize: 10, color: COLORS.secText, fontWeight: '700', marginBottom: 4, letterSpacing: 0.8 },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.accent, marginBottom: 2 },
  statSub: { fontSize: 10, color: COLORS.muted },
  table: { backgroundColor: COLORS.white, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.cardAlt, paddingVertical: 8, paddingHorizontal: 10 },
  tableHeaderText: { color: COLORS.navy, fontWeight: '800', fontSize: 10, letterSpacing: 0.8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#FAFBFC' },
  tableRowTotal: { backgroundColor: COLORS.cardAlt },
  tableCell: { color: COLORS.secText, fontSize: 12 },
  tableCellBold: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  formGroup: { marginBottom: 12 },
  formRow: { flexDirection: 'row' },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.navy, letterSpacing: 1.5, marginBottom: 7 },
  inputWrapper: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.inputBg, overflow: 'hidden' },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.navy },
  textarea: { height: 90, paddingTop: 10 },
  pickerWrapper: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.inputBg, overflow: 'hidden' },
  pickerBox: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.inputBg, overflow: 'hidden' },
  picker: { color: COLORS.navy, backgroundColor: COLORS.inputBg },
  btnPrimary: { backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4, shadowColor: COLORS.accent, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  btnText: { color: COLORS.white, fontWeight: '800', fontSize: 13, letterSpacing: 1.5 },
  btnSecondary: { borderWidth: 1.5, borderColor: COLORS.accent, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnSecondaryText: { color: COLORS.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  btnDanger: { backgroundColor: COLORS.danger, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 4, alignItems: 'center' },
  btnDangerText: { color: COLORS.white, fontWeight: '700', fontSize: 10 },
  buttonRow: { flexDirection: 'row', marginTop: 4 },
  resultCard: { backgroundColor: COLORS.cardAlt, padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.accent, borderWidth: 1, borderColor: COLORS.border },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  resultTitle: { fontWeight: '700', fontSize: 13, color: COLORS.navy, flex: 1 },
  resultOutcome: { fontWeight: '800', fontSize: 11, marginLeft: 8 },
  resultMeta: { fontSize: 10, color: COLORS.secText, marginBottom: 4 },
  resultSummary: { fontSize: 12, color: COLORS.secText, marginTop: 4, lineHeight: 17 },
  bookingMatchCard: { backgroundColor: COLORS.cardAlt, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  bookingMatchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  bookingMatchHeaderLeft: { flex: 1 },
  bookingMatchTitle: { fontWeight: '700', fontSize: 14, color: COLORS.navy, marginBottom: 3 },
  bookingMatchDate: { fontSize: 11, color: COLORS.muted },
  bookingMatchHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookingMatchStats: { flexDirection: 'column', alignItems: 'flex-end' },
  bookingMatchStat: { fontSize: 11, color: COLORS.secText, fontWeight: '600' },
  expandIcon: { fontSize: 12, color: COLORS.muted, marginLeft: 4 },
  bookingMatchDetails: { padding: 12, backgroundColor: COLORS.cardAlt },
  bookingItem: { backgroundColor: COLORS.white, padding: 10, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  bookingItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  bookingItemFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  bookingRef: { fontWeight: '700', fontSize: 12, color: COLORS.accent },
  statusPill: { borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2 },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  bookingInfo: { fontSize: 11, color: COLORS.secText, marginBottom: 6 },
  bookingTickets: { fontSize: 12, color: COLORS.secText, fontWeight: '600' },
  bookingAmount: { fontSize: 14, fontWeight: '800', color: COLORS.accent },
  bookingDate: { fontSize: 10, color: COLORS.muted },
  feeCurrentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.cardAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginBottom: 12 },
  feeCurrentLabel: { fontSize: 12, color: COLORS.secText },
  feeCurrentValue: { fontSize: 18, fontWeight: '900', color: COLORS.accent },
  galleryPreviewImage: { width: '100%', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  orientationButtons: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  orientationButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardAlt, alignItems: 'center' },
  orientationButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  orientationButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  orientationButtonTextActive: { color: COLORS.white },
  removeImageBtn: { marginTop: 8, alignItems: 'center' },
  removeImageText: { color: COLORS.dangerText, fontSize: 12, fontWeight: '700' },
  commentAdminCard: { backgroundColor: COLORS.cardAlt, padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.accent, borderWidth: 1, borderColor: COLORS.border },
  commentAdminHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  commentAdminName: { fontWeight: '700', fontSize: 13, color: COLORS.navy, flex: 1 },
  commentAdminText: { fontSize: 13, color: COLORS.secText, marginBottom: 6, lineHeight: 20 },
  commentAdminDate: { fontSize: 10, color: COLORS.muted, marginBottom: 8 },
  commentAdminActions: { flexDirection: 'row', alignItems: 'center' },
  playerSelector: { maxHeight: 150, marginBottom: 8 },
  playerChip: { backgroundColor: COLORS.cardAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, margin: 3 },
  playerChipSelected: { borderColor: COLORS.accent, backgroundColor: '#E8F4FD' },
  playerChipText: { fontSize: 11, color: COLORS.secText },
  playerChipTextSelected: { color: COLORS.accent, fontWeight: '700' },
  selectedCount: { fontSize: 11, color: COLORS.muted, marginBottom: 8 },
  pollAdminCard: { backgroundColor: COLORS.cardAlt, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  pollAdminHeader: { marginBottom: 10 },
  pollQuestionText: { fontSize: 13, fontWeight: '700', color: COLORS.navy, marginBottom: 4, lineHeight: 19 },
  pollMetaText: { fontSize: 10, color: COLORS.muted, marginBottom: 6 },
  pollHintText: { fontSize: 11, color: COLORS.muted, marginBottom: 10, lineHeight: 16, fontStyle: 'italic' },
  pollStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topVoterText: { fontSize: 10, color: COLORS.accent, marginLeft: 8 },
  pollVoteList: { marginBottom: 10, paddingLeft: 4 },
  pollVoteRow: { marginBottom: 6 },
  pollVoteName: { fontSize: 11, color: COLORS.secText, marginBottom: 2 },
  pollVoteCount: { fontSize: 10, color: COLORS.muted, marginBottom: 3 },
  pollVoteBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  pollVoteFill: { height: 4, backgroundColor: COLORS.accent, borderRadius: 2 },
  btnSmallSecondary: { borderWidth: 1, borderColor: COLORS.accent, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center' },
  btnSmallSecondaryText: { color: COLORS.accent, fontWeight: '700', fontSize: 10, letterSpacing: 0.8 },
  btnSmallDanger: { backgroundColor: COLORS.danger, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center' },
  btnSmallDangerText: { color: COLORS.white, fontWeight: '700', fontSize: 10, letterSpacing: 0.8 },
  noDataText: { textAlign: 'center', padding: 24, color: COLORS.muted, fontSize: 13 },
  footer: { backgroundColor: COLORS.card, padding: 24, marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  footerContent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  footerSection: { minWidth: 160, marginBottom: 16 },
  footerHeading: { color: COLORS.accent, fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' },
  footerText: { color: COLORS.secText, marginBottom: 4, fontSize: 12 },
  footerLink: { color: COLORS.secText, marginBottom: 4, fontSize: 12 },
  footerBottom: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  footerBottomText: { color: COLORS.muted, fontSize: 11 },
  adminForm: { marginBottom: 16 },
  adminFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  adminFormTitle: { fontSize: 11, fontWeight: '800', color: COLORS.accent, letterSpacing: 1.5 },
  adminFormCancel: { fontSize: 11, color: COLORS.muted, fontWeight: '700' },
  adminList: { marginTop: 16 },
  adminRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  adminName: { fontSize: 13, fontWeight: '700', color: COLORS.navy },
  adminMeta: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
  adminRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3 },
  roleBadgeSuper: { backgroundColor: '#EDE7F6', borderWidth: 1, borderColor: '#CE93D8' },
  roleBadgeAdmin: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  roleBadgeEditor: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFE082' },
  roleBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8, color: COLORS.secText },
  deleteAdminBtn: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#EF9A9A', borderRadius: 3, paddingVertical: 4, paddingHorizontal: 8 },
  deleteAdminBtnText: { fontSize: 9, fontWeight: '800', color: COLORS.dangerText, letterSpacing: 0.5 },
  emptyRow: { alignItems: 'center', paddingVertical: 32 },

  // New wizard styles
  stepTitle: { fontSize: 14, fontWeight: '700', color: COLORS.navy, marginBottom: 8, marginTop: 8 },
  hintText: { fontSize: 12, color: COLORS.muted, marginBottom: 12, fontStyle: 'italic' },
  playerCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: 4,
  },
  playerCheckboxSelected: { backgroundColor: COLORS.accent + '15', borderColor: COLORS.accent },
  playerCheckboxText: { fontSize: 13, color: COLORS.navy, flex: 1 },
  checkmark: { fontSize: 16, color: COLORS.green, fontWeight: 'bold' },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 8 },
  statPlayerName: { flex: 2, fontSize: 13, color: COLORS.navy },
  statInputSmall: { width: 60, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 8, textAlign: 'center', marginRight: 8, backgroundColor: COLORS.inputBg, color: COLORS.navy },
  statLabel: { fontSize: 12, color: COLORS.muted, marginRight: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 8 },
  cardInputGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardInput: { width: 50, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 8, textAlign: 'center', marginHorizontal: 4, backgroundColor: COLORS.inputBg, color: COLORS.navy },
  cardLabel: { fontSize: 12, color: COLORS.muted, marginHorizontal: 4 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reviewPlayerName: { fontSize: 13, fontWeight: '500', color: COLORS.navy },
  reviewStats: { fontSize: 12, color: COLORS.secText },
  btnDisabled: { opacity: 0.6 },
});