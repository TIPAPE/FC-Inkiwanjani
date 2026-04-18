// frontend/src/screens/ReportsScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Platform, StatusBar, Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { authStorage } from '../utils/authStorage';
import { API_BASE_URL } from '../constants/config';

// ─── COLOR TOKENS (matching the app) ────────────────────────────────────────
const C = {
  accent:     '#2E86C1',
  navy:       '#1B4F72',
  secText:    '#5D6D7E',
  muted:      '#85929E',
  green:      '#27AE60',
  greenDark:  '#1E8449',
  red:        '#E74C3C',
  redDark:    '#C0392B',
  blue:       '#3498DB',
  amber:      '#F39C12',
  white:      '#FFFFFF',
  card:       'rgba(255,255,255,0.92)',
  cardAlt:    '#F8F9FA',
  border:     '#E8ECEF',
  inputBg:    '#FFFFFF',
  text:       '#1B4F72',
  textSec:    '#5D6D7E',
  textMuted:  '#85929E',
};
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

// ─── FORMATTERS ──────────────────────────────────────────────────────────────
const fKES = (n) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fDate = (s) => s ? new Date(s).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fNum = (n, dec = 0) => Number(n || 0).toFixed(dec);
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

// ─── REPORT TABS ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'executive',      label: 'Dashboard',    group: 'Executive' },
  { id: 'revenue',        label: 'Revenue',      group: 'Finance'   },
  { id: 'matchday-rev',   label: 'Match-Day Rev',group: 'Finance'   },
  { id: 'tickets',        label: 'Ticket Sales', group: 'Tickets'   },
  { id: 'season-perf',    label: 'Season Stats', group: 'Matches'   },
  { id: 'player-perf',    label: 'Player Stats', group: 'Players'   },
  { id: 'squad-overview', label: 'Squad',        group: 'Players'   },
  { id: 'top-scorers',    label: 'Top Scorers',  group: 'Players'   },
  { id: 'attendance',     label: 'Attendance',   group: 'Fan Data'  },
  { id: 'membership',     label: 'Memberships',  group: 'Members'   },
];

export default function ReportsScreen({ navigation, route }) {
  const params = route?.params || {};
  const [token, setToken] = useState(params.token || null);
  const user = params.user || {};

  const [activeTab, setActiveTab] = useState('executive');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState('');
  const toastAnim = useRef(new Animated.Value(-80)).current;
  const toastLive = useRef(false);

  // Filters
  const [revenueGroupBy, setRevenueGroupBy] = useState('month');
  const [matchSeason, setMatchSeason] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');
  const [memberStatus, setMemberStatus] = useState('all');
  // ✅ FIX: Default executive period changed from 'month' to 'all'
  //    so the Dashboard shows ALL matches (same as Season Stats)
  const [execPeriod, setExecPeriod] = useState('all');
  const [topLimit, setTopLimit] = useState('10');

  useEffect(() => {
    if (!token) {
      authStorage.getToken().then(t => { if (t) setToken(t); });
    }
  }, []);

  const showToast = (msg) => {
    if (toastLive.current) return;
    toastLive.current = true;
    setToast(msg);
    toastAnim.setValue(-80);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 20, duration: 280, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(toastAnim, { toValue: -80, duration: 280, useNativeDriver: true }),
    ]).start(() => { toastLive.current = false; setToast(''); });
  };

  const api = useCallback(async (endpoint) => {
    const url = `${API_BASE_URL}/admin${endpoint}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
    return json;
  }, [token]);

  const buildEndpoint = useCallback(() => {
    const q = (...pairs) => {
      const parts = pairs.filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
      return parts.length ? '?' + parts.join('&') : '';
    };
    switch (activeTab) {
      case 'revenue':       return `/reports/revenue${q(['groupBy', revenueGroupBy])}`;
      case 'matchday-rev':  return `/reports/match-day-revenue`;
      case 'tickets':       return `/reports/tickets`;
      case 'season-perf':   return `/reports/season-performance${q(['season', matchSeason])}`;
      case 'player-perf':   return `/reports/player-performance${q(['position', playerPosition])}`;
      case 'squad-overview':return `/reports/squad-overview`;
      case 'top-scorers':   return `/reports/top-scorers${q(['limit', topLimit])}`;
      case 'attendance':    return `/reports/attendance`;
      case 'membership':    return `/reports/membership${q(['status', memberStatus])}`;
      case 'executive':     return `/reports/executive-dashboard${q(['period', execPeriod])}`;
      default: return null;
    }
  }, [activeTab, revenueGroupBy, matchSeason, playerPosition, memberStatus, execPeriod, topLimit]);

  const loadReport = useCallback(async () => {
    const endpoint = buildEndpoint();
    if (!endpoint || !token) return;
    setLoading(true);
    setData(null);
    try {
      const res = await api(endpoint);
      if (res.success) setData(res.data);
      else showToast('Failed to load report');
    } catch (e) {
      showToast(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [buildEndpoint, api, token]);

  useEffect(() => { loadReport(); }, [loadReport]);

  // ─── PDF GENERATION WITH TEMPLATES (unchanged) ─────────────────────────────
  const generateExecutiveHTML = (d) => {
    const k = d.kpis || {};
    const topScorers = d.topScorers || [];
    const fixtures = d.upcomingFixtures || [];
    const news = d.recentNews || [];
    const winPct = k.win_percentage || 0;
    return `
      <h2>Key Performance Indicators</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="val">${fKES(k.total_revenue)}</div><div class="lbl">Total Revenue</div></div>
        <div class="kpi"><div class="val">${(k.total_tickets||0).toLocaleString()}</div><div class="lbl">Tickets Sold</div></div>
        <div class="kpi"><div class="val">${k.active_members||0}</div><div class="lbl">Active Members</div></div>
        <div class="kpi"><div class="val">${k.total_matches||0}</div><div class="lbl">Matches Played</div></div>
        <div class="kpi"><div class="val">${winPct}%</div><div class="lbl">Win Rate</div></div>
      </div>
      <div class="ring">🏆 Win Rate: ${winPct}%</div>
      ${topScorers.length ? `<h2>Top 5 Scorers</h2><table><thead><tr><th>#</th><th>Name</th><th>Position</th><th>Goals</th><th>Assists</th></tr></thead><tbody>${topScorers.map((p,i) => `<tr><td>${p.jersey_number}</td><td>${p.name}</td><td>${p.position}</td><td>${p.goals||0}</td><td>${p.assists||0}</td></tr>`).join('')}</tbody></table>` : ''}
      ${fixtures.length ? `<h2>Upcoming Fixtures</h2><table><thead><tr><th>Opponent</th><th>Date</th><th>Venue</th><th>Competition</th><th>Days Away</th></tr></thead><tbody>${fixtures.map(f => `<tr><td>vs ${f.opponent}</td><td>${fDate(f.match_date)}</td><td>${f.venue}</td><td>${f.competition}</td><td>${f.days_away}d</td></tr>`).join('')}</tbody></table>` : ''}
      ${news.length ? `<h2>Recent News</h2><ul>${news.map(n => `<li><strong>${n.title}</strong> – ${n.category} (${fDate(n.created_at)})</li>`).join('')}</ul>` : ''}
    `;
  };

  const generateRevenueHTML = (d) => {
    const summary = d.summary || [];
    const totals = d.totals || {};
    const breakdown = d.breakdown || [];
    const growth = d.growth || [];
    return `
      <h2>Revenue Summary</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="val">${fKES(totals.grand_total)}</div><div class="lbl">Grand Total</div></div>
        <div class="kpi"><div class="val">${totals.total_transactions||0}</div><div class="lbl">Transactions</div></div>
        <div class="kpi"><div class="val">${fKES(totals.avg_transaction)}</div><div class="lbl">Avg Transaction</div></div>
      </div>
      <h2>Revenue by Source</h2>
      <table><thead><tr><th>Source</th><th>Total (KES)</th><th>Transactions</th><th>Avg (KES)</th></tr></thead><tbody>${summary.map(s => `<tr><td>${s.source}</td><td>${fKES(s.total_amount)}</td><td>${s.transaction_count}</td><td>${fKES(s.average_amount)}</td></tr>`).join('')}</tbody></table>
      ${breakdown.length ? `<h2>Period Breakdown (${revenueGroupBy})</h2><table><thead><tr><th>Period</th><th>Source</th><th>Amount (KES)</th><th>Transactions</th></tr></thead><tbody>${breakdown.map(b => `<tr><td>${b.period}</td><td>${b.source}</td><td>${fKES(b.total_amount)}</td><td>${b.transaction_count}</td></tr>`).join('')}</tbody></table>` : ''}
      ${growth.length ? `<h2>Monthly Trend (last 12 months)</h2></table><thead><tr><th>Month</th><th>Total (KES)</th></tr></thead><tbody>${growth.map(g => `<tr><td>${g.month}</td><td>${fKES(g.total)}</td></tr>`).join('')}</tbody></table>` : ''}
    `;
  };

  const generateTicketSalesHTML = (d) => {
    const byMatch = d.byMatch || [];
    const summary = d.summary || [];
    const totals = d.totals || {};
    return `
      <h2>Ticket Sales Overview</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="val">${totals.total_bookings||0}</div><div class="lbl">Bookings</div></div>
        <div class="kpi"><div class="val">${(totals.total_tickets||0).toLocaleString()}</div><div class="lbl">Tickets Sold</div></div>
        <div class="kpi"><div class="val">${fKES(totals.net_revenue)}</div><div class="lbl">Net Revenue</div></div>
        <div class="kpi"><div class="val">${totals.conversion_rate||0}%</div><div class="lbl">Conversion Rate</div></div>
      </div>
      ${summary.length ? `<h2>By Ticket Type</h2><table><thead><tr><th>Type</th><th>Total Revenue</th><th>Tickets</th><th>Bookings</th></tr></thead><tbody>${summary.map(s => `<tr><td>${s.ticket_type}</td><td>${fKES(s.total_revenue)}</td><td>${s.total_tickets||0}</td><td>${s.total_bookings||0}</td></tr>`).join('')}</tbody></table>` : ''}
      ${byMatch.length ? `<h2>Sales by Match</h2><table><thead><tr><th>Match</th><th>Type</th><th>Tickets Sold</th><th>Paid Revenue</th><th>Conv %</th></tr></thead><tbody>${byMatch.map(b => `<tr><td>vs ${b.opponent}</td><td>${b.ticket_type}</td><td>${b.tickets_sold}</td><td>${fKES(b.paid_revenue)}</td><td>${b.conversion_rate}%</td></tr>`).join('')}</tbody></table>` : ''}
    `;
  };

  const generateSeasonPerfHTML = (d) => {
    const st = d.statistics || {};
    const byVenue = d.byVenue || [];
    const monthly = d.monthlyForm || [];
    const recent = d.recentForm || [];
    return `
      <h2>Season Overview</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="val">${st.total_matches||0}</div><div class="lbl">Played</div></div>
        <div class="kpi"><div class="val">${st.wins||0}</div><div class="lbl">Wins</div></div>
        <div class="kpi"><div class="val">${st.draws||0}</div><div class="lbl">Draws</div></div>
        <div class="kpi"><div class="val">${st.losses||0}</div><div class="lbl">Losses</div></div>
        <div class="kpi"><div class="val">${st.goals_scored||0}</div><div class="lbl">GF</div></div>
        <div class="kpi"><div class="val">${st.goals_conceded||0}</div><div class="lbl">GA</div></div>
        <div class="kpi"><div class="val">${st.win_percentage||0}%</div><div class="lbl">Win Rate</div></div>
      </div>
      <h2>Home vs Away Record</h2>
      <table><thead><tr><th>Venue</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th></tr></thead><tbody>${byVenue.map(v => `<tr><td>${v.venue}</td><td>${v.played}</td><td>${v.wins}</td><td>${v.draws}</td><td>${v.losses}</td><td>${v.goals_for||0}</td><td>${v.goals_against||0}</td></tr>`).join('')}</tbody></table>
      <h2>Recent Form (last 5)</h2><div class="form-beads">${recent.map(r => `<span class="form-bead ${r === 'W' ? 'win' : r === 'D' ? 'draw' : 'loss'}">${r}</span>`).join('')}</div>
      ${monthly.length ? `<h2>Monthly Wins</h2><table><thead><tr><th>Month</th><th>Wins</th></tr></thead><tbody>${monthly.map(m => `<tr><td>${m.month}</td><td>${m.wins}</td></tr>`).join('')}</tbody></table>` : ''}
    `;
  };

  const generatePlayerPerfHTML = (d) => {
    const players = d.players || [];
    const posStats = d.positionStats || [];
    const disc = d.discipline || {};
    return `
      <h2>Player Statistics</h2>
      <table><thead><tr><th>#</th><th>Name</th><th>Pos</th><th>Apps</th><th>Goals</th><th>Assists</th><th>G/G</th><th>YC</th><th>RC</th></tr></thead><tbody>${players.map(p => `<tr><td>${p.jersey_number}</td><td>${p.name}</td><td>${p.position}</td><td>${p.appearances||0}</td><td>${p.goals||0}</td><td>${p.assists||0}</td><td>${p.goals_per_game||0}</td><td>${p.yellow_cards||0}</td><td>${p.red_cards||0}</td></tr>`).join('')}</tbody></table>
      <h2>Squad by Position</h2>
      <table><thead><tr><th>Position</th><th>Players</th><th>Goals</th><th>Assists</th><th>Avg Age</th></tr></thead><tbody>${posStats.map(ps => `<tr><td>${ps.position}</td><td>${ps.player_count}</td><td>${ps.total_goals||0}</td><td>${ps.total_assists||0}</td><td>${Number(ps.avg_age||0).toFixed(1)}</td></tr>`).join('')}</tbody></table>
      <h2>Discipline</h2><div class="kpi-grid"><div class="kpi"><div class="val">${disc.total_yellows||0}</div><div class="lbl">Yellow Cards</div></div><div class="kpi"><div class="val">${disc.total_reds||0}</div><div class="lbl">Red Cards</div></div></div>
    `;
  };

  const generateSquadOverviewHTML = (d) => {
    const squad = d.squad || [];
    const st = d.summary || {};
    const byPos = d.byPosition || [];
    return `
      <h2>Squad Summary</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="val">${st.total_players||0}</div><div class="lbl">Players</div></div>
        <div class="kpi"><div class="val">${Number(st.avg_age||0).toFixed(1)}</div><div class="lbl">Avg Age</div></div>
        <div class="kpi"><div class="val">${st.total_goals||0}</div><div class="lbl">Goals</div></div>
        <div class="kpi"><div class="val">${st.total_assists||0}</div><div class="lbl">Assists</div></div>
        <div class="kpi"><div class="val">${st.total_appearances||0}</div><div class="lbl">Appearances</div></div>
      </div>
      <h2>Full Roster</h2>
      <table><thead><tr><th>#</th><th>Name</th><th>Pos</th><th>Age</th><th>Goals</th><th>Apps</th></tr></thead><tbody>${squad.map(p => `<tr><td>${p.jersey_number}</td><td>${p.name}</td><td>${p.position}</td><td>${p.age}</td><td>${p.goals||0}</td><td>${p.appearances||0}</td></tr>`).join('')}</tbody></table>
      <h2>Position Breakdown</h2>
      <tr><thead><tr><th>Position</th><th>Count</th><th>Avg Age</th><th>Goals</th><th>Assists</th></tr></thead><tbody>${byPos.map(bp => `<tr><td>${bp.position}</td><td>${bp.count}</td><td>${Number(bp.avg_age||0).toFixed(1)}</td><td>${bp.goals||0}</td><td>${bp.assists||0}</td></tr>`).join('')}</tbody></table>
    `;
  };

  const generateTopScorersHTML = (d) => {
    const scorers = d.topScorers || [];
    const assists = d.topAssists || [];
    return `
      <h2>Top Goal Scorers</h2>
      <table><thead><tr><th>Rank</th><th>Name</th><th>Pos</th><th>Goals</th><th>Assists</th><th>G/G</th></tr></thead><tbody>${scorers.map((s,i) => `<tr><td>${i+1}</td><td>${s.name}</td><td>${s.position}</td><td>${s.goals}</td><td>${s.assists}</td><td>${s.goals_per_game||0}</td></tr>`).join('')}</tbody></table>
      <h2>Top Assisters</h2>
      <table><thead><tr><th>Rank</th><th>Name</th><th>Pos</th><th>Assists</th><th>Goals</th><th>A/G</th></tr></thead><tbody>${assists.map((a,i) => `<tr><td>${i+1}</td><td>${a.name}</td><td>${a.position}</td><td>${a.assists}</td><td>${a.goals}</td><td>${a.assists_per_game||0}</td></tr>`).join('')}</tbody></table>
    `;
  };

  const generateAttendanceHTML = (d) => {
    const matches = d.matches || [];
    const st = d.statistics || {};
    const byVenue = d.byVenue || [];
    const byComp = d.byCompetition || [];
    return `
      <h2>Attendance Statistics</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="val">${Math.round(st.avg_attendance||0).toLocaleString()}</div><div class="lbl">Avg Attendance</div></div>
        <div class="kpi"><div class="val">${(st.max_attendance||0).toLocaleString()}</div><div class="lbl">Highest</div></div>
        <div class="kpi"><div class="val">${(st.total_attendance||0).toLocaleString()}</div><div class="lbl">Total</div></div>
      </div>
      <h2>By Venue</h2><table><thead><tr><th>Venue</th><th>Avg Attendance</th><th>Matches</th></tr></thead><tbody>${byVenue.map(v => `<tr><td>${v.venue}</td><td>${Math.round(v.avg_attendance||0).toLocaleString()}</td><td>${v.match_count}</td></tr>`).join('')}</tbody></table>
      <h2>By Competition</h2><table><thead><tr><th>Competition</th><th>Avg Attendance</th><th>Total</th><th>Matches</th></tr></thead><tbody>${byComp.map(c => `<tr><td>${c.competition}</td><td>${Math.round(c.avg_attendance||0).toLocaleString()}</td><td>${(c.total_attendance||0).toLocaleString()}</td><td>${c.match_count}</td></tr>`).join('')}</tbody></table>
      <h2>Match Attendance</h2><table><thead><tr><th>vs</th><th>Date</th><th>Venue</th><th>Crowd</th></tr></thead><tbody>${matches.map(m => `<tr><td>vs ${m.opponent}</td><td>${fDate(m.match_date)}</td><td>${m.venue}</td><td>${(m.attendance||0).toLocaleString()}</td></tr>`).join('')}</tbody></table>
    `;
  };

  const generateMembershipHTML = (d) => {
    const members = d.memberships || [];
    const st = d.statistics || {};
    const growth = d.monthlyGrowth || [];
    return `
      <h2>Membership Overview</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="val">${st.total_members||0}</div><div class="lbl">Total Members</div></div>
        <div class="kpi"><div class="val">${st.active_members||0}</div><div class="lbl">Active</div></div>
        <div class="kpi"><div class="val">${st.expired_members||0}</div><div class="lbl">Expired</div></div>
        <div class="kpi"><div class="val">${st.expiring_soon||0}</div><div class="lbl">Expiring Soon</div></div>
        <div class="kpi"><div class="val">${fKES(st.total_revenue)}</div><div class="lbl">Revenue</div></div>
      </div>
      <h2>Monthly Growth</h2><tr><thead><tr><th>Month</th><th>New Members</th></tr></thead><tbody>${growth.map(g => `<tr><td>${g.month}</td><td>${g.new_members}</td></tr>`).join('')}</tbody></table>
      <h2>Member List</h2><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Expiry</th><th>Days Left</th></tr></thead><tbody>${members.map(m => `<tr><td>${m.full_name}</td><td>${m.email}</td><td>${m.phone}</td><td>${m.days_until_expiry < 0 ? 'Expired' : 'Active'}</td><td>${fDate(m.expiry_date)}</td><td>${m.days_until_expiry < 0 ? `${Math.abs(m.days_until_expiry)}d ago` : `${m.days_until_expiry}d`}</td></tr>`).join('')}</tbody></table>
    `;
  };

  const generateMatchDayRevenueHTML = (d) => {
    const byMatch = d.byMatch || [];
    const av = d.averages || {};
    return `
      <h2>Match Day Revenue Averages</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="val">${fKES(av.avg_match_revenue)}</div><div class="lbl">Avg Per Match</div></div>
        <div class="kpi"><div class="val">${fKES(av.max_match_revenue)}</div><div class="lbl">Highest Match</div></div>
        <div class="kpi"><div class="val">${fKES(av.min_match_revenue)}</div><div class="lbl">Lowest Match</div></div>
      </div>
      <h2>Match Day Revenue Breakdown</h2>
      <table><thead><tr><th>vs</th><th>Date</th><th>Attendance</th><th>Tickets Sold</th><th>Revenue</th><th>Rev/Attendee</th></tr></thead><tbody>${byMatch.map(m => `<tr><td>vs ${m.opponent}</td><td>${fDate(m.match_date)}</td><td>${(m.attendance||0).toLocaleString()}</td><td>${m.tickets_sold||0}</td><td>${fKES(m.ticket_revenue)}</td><td>${fKES(m.revenue_per_attendee)}</td></tr>`).join('')}</tbody></table>
    `;
  };

  const generateHTML = () => {
    if (!data) return '';
    const titleMap = {
      executive: 'Executive Dashboard', revenue: 'Revenue Summary', 'matchday-rev': 'Match Day Revenue',
      tickets: 'Ticket Sales Report', 'season-perf': 'Season Performance', 'player-perf': 'Player Performance',
      'squad-overview': 'Squad Overview', 'top-scorers': 'Top Scorers', attendance: 'Attendance Report',
      membership: 'Membership Overview',
    };
    const title = titleMap[activeTab] || 'Report';
    let content = '';
    switch (activeTab) {
      case 'executive': content = generateExecutiveHTML(data); break;
      case 'revenue': content = generateRevenueHTML(data); break;
      case 'matchday-rev': content = generateMatchDayRevenueHTML(data); break;
      case 'tickets': content = generateTicketSalesHTML(data); break;
      case 'season-perf': content = generateSeasonPerfHTML(data); break;
      case 'player-perf': content = generatePlayerPerfHTML(data); break;
      case 'squad-overview': content = generateSquadOverviewHTML(data); break;
      case 'top-scorers': content = generateTopScorersHTML(data); break;
      case 'attendance': content = generateAttendanceHTML(data); break;
      case 'membership': content = generateMembershipHTML(data); break;
      default: content = '<p>No data available</p>';
    }
    const now = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title} - FC Inkiwanjani</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          background: #e2e8f0;
          padding: 30px;
          color: #1e293b;
        }
        .report {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 35px -10px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
          color: white;
          padding: 24px 30px;
          text-align: center;
        }
        .header h1 { font-size: 28px; letter-spacing: 2px; margin-bottom: 5px; }
        .header p { opacity: 0.8; font-size: 14px; }
        .content { padding: 30px; }
        h2 {
          font-size: 18px;
          margin: 24px 0 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #2E86C1;
          color: #1e3a5f;
        }
        .kpi-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin: 20px 0;
        }
        .kpi {
          flex: 1;
          min-width: 150px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        .kpi .val { font-size: 24px; font-weight: bold; color: #2E86C1; }
        .kpi .lbl { font-size: 12px; color: #64748b; margin-top: 5px; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 12px;
        }
        th {
          background: #2E86C1;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        tr:nth-child(even) td { background: #f8fafc; }
        .form-beads {
          display: flex;
          gap: 8px;
          margin: 16px 0;
        }
        .form-bead {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
        }
        .win { background: #27ae60; color: white; }
        .draw { background: #f39c12; color: white; }
        .loss { background: #e74c3c; color: white; }
        .ring {
          text-align: center;
          font-size: 28px;
          font-weight: bold;
          color: #2E86C1;
          margin: 20px 0;
        }
        .footer {
          background: #f1f5f9;
          padding: 16px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
        @media print {
          body { background: white; padding: 0; }
          .report { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="report">
        <div class="header">
          <h1>FC INKIWANJANI</h1>
          <p>${title}</p>
          <p>Generated on ${now}</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          FC Inkiwanjani – The Pride of Mile 46 | Confidential Club Report
        </div>
      </div>
    </body>
    </html>`;
  };

  const exportPDF = async () => {
    if (!data) {
      showToast('Load a report first');
      return;
    }
    setLoading(true);
    try {
      showToast('Generating PDF...');
      const html = generateHTML();
      if (Platform.OS === 'web') {
        const win = window.open();
        win.document.write(html);
        win.document.close();
        win.print();
        showToast('Report ready for printing', 'success');
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (!uri) throw new Error('Failed to generate PDF');
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
            dialogTitle: `${activeTab}_report.pdf`,
          });
          showToast('PDF shared successfully', 'success');
        } else {
          showToast(`PDF saved to ${uri}`, 'info');
        }
      }
    } catch (error) {
      console.error('PDF export error:', error);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── RENDER COMPONENTS (using data from state) ─────────────────────────────
  const renderExecutive = () => {
    if (!data) return null;
    const { kpis = {}, topScorers = [], upcomingFixtures = [], recentNews = [] } = data;
    const winPct = kpis.win_percentage || 0;
    return (
      <>
        <View style={s.card}>
          <Divider label="KEY PERFORMANCE INDICATORS" />
          <View style={s.grid2}>
            <KpiCard label="TOTAL REVENUE"   value={fKES(kpis.total_revenue)}     sub="All sources"         accent={C.accent}  />
            <KpiCard label="TICKETS SOLD"    value={(kpis.total_tickets||0).toLocaleString()} sub="Paid bookings" accent={C.green} />
            <KpiCard label="ACTIVE MEMBERS"  value={kpis.active_members||0}        sub="Valid memberships"   accent={C.accent}  />
            <KpiCard label="MATCHES PLAYED"  value={kpis.total_matches||0}         sub={`${winPct}% win rate`} accent={C.accent} />
          </View>
          <View style={s.ringRow}>
            <StatRing pct={winPct} label="WIN RATE" value={`${kpis.total_matches||0} played`} color={C.green} />
          </View>
        </View>
        {topScorers.length > 0 && (
          <View style={s.card}>
            <Divider label="TOP 5 SCORERS" />
            <Table data={topScorers} cols={[{ label:'#', key:'jersey_number', flex:0.5 },{ label:'Name', key:'name', flex:2 },{ label:'Pos', key:'position', flex:1 },{ label:'Gls', key:'goals', flex:0.7, bold:true },{ label:'Ast', key:'assists', flex:0.7 }]} />
          </View>
        )}
        {upcomingFixtures.length > 0 && (
          <View style={s.card}>
            <Divider label="NEXT FIXTURES" />
            {upcomingFixtures.map((f,i) => (
              <View key={i} style={[s.fixtureRow, i%2===1 && s.trAlt]}>
                <View style={{flex:1}}><Text style={s.fixtureOpp} numberOfLines={1}>vs {f.opponent}</Text><Text style={s.fixtureMeta}>{fDate(f.match_date)} · {f.venue} · {f.competition}</Text></View>
                <Pill label={`${f.days_away}d`} color={C.accent} bg={'#E8F4FD'} />
              </View>
            ))}
          </View>
        )}
        {recentNews.length > 0 && (
          <View style={s.card}>
            <Divider label="RECENT NEWS" />
            {recentNews.map((n,i) => (
              <View key={i} style={[s.newsRow, i%2===1 && s.trAlt]}>
                <Text style={s.newsTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={s.newsMeta}>{n.category} · {fDate(n.created_at)}</Text>
              </View>
            ))}
          </View>
        )}
      </>
    );
  };

  const renderRevenue = () => {
    if (!data) return null;
    const { summary = [], totals = {}, breakdown = [], growth = [] } = data;
    return (
      <>
        <View style={s.card}>
          <Divider label="TOTALS" />
          <View style={s.grid2}>
            <KpiCard label="GRAND TOTAL" value={fKES(totals.grand_total)} sub={`${totals.total_transactions||0} transactions`} accent={C.accent} />
            <KpiCard label="AVG TRANSACTION" value={fKES(totals.avg_transaction)} sub="Per entry" />
          </View>
        </View>
        {summary.length > 0 && (
          <View style={s.card}>
            <Divider label="BY REVENUE SOURCE" />
            <BarChart data={summary} labelKey="source" valueKey="total_amount" color={C.accent} formatValue={fKES} />
            <Table data={summary} cols={[{ label:'Source', key:'source', flex:2, render:r=>(r.source||'').charAt(0).toUpperCase()+(r.source||'').slice(1) },{ label:'Total', key:'total_amount', flex:2, bold:true, render:r=>fKES(r.total_amount) },{ label:'Txns', key:'transaction_count', flex:1 },{ label:'Avg', key:'average_amount', flex:2, render:r=>fKES(r.average_amount) }]} />
          </View>
        )}
        {growth.length > 0 && (
          <View style={s.card}>
            <Divider label="MONTHLY TREND (last 12 months)" />
            <BarChart data={[...growth].reverse()} labelKey="month" valueKey="total" color={C.accent} formatValue={fKES} />
          </View>
        )}
        {breakdown.length > 0 && (
          <View style={s.card}>
            <Divider label={`BREAKDOWN (BY ${revenueGroupBy.toUpperCase()})`} />
            <Table data={breakdown} cols={[{ label:'Period', key:'period', flex:2 },{ label:'Source', key:'source', flex:1.5, render:r=>(r.source||'').charAt(0).toUpperCase()+(r.source||'').slice(1) },{ label:'Amount', key:'total_amount', flex:2, bold:true, render:r=>fKES(r.total_amount) },{ label:'Txns', key:'transaction_count', flex:0.8 }]} />
          </View>
        )}
      </>
    );
  };

  const renderMatchDayRevenue = () => {
    if (!data) return null;
    const { byMatch = [], averages = {} } = data;
    return (
      <>
        <View style={s.card}>
          <Divider label="AVERAGES" />
          <View style={s.grid2}>
            <KpiCard label="AVG PER MATCH" value={fKES(averages.avg_match_revenue)} accent={C.accent} />
            <KpiCard label="HIGHEST MATCH" value={fKES(averages.max_match_revenue)} />
            <KpiCard label="LOWEST MATCH" value={fKES(averages.min_match_revenue)} />
          </View>
        </View>
        {byMatch.length > 0 && (
          <View style={s.card}>
            <Divider label="REVENUE BY MATCH" />
            <BarChart data={byMatch.slice(0,8)} labelKey="opponent" valueKey="ticket_revenue" color={C.green} formatValue={fKES} />
            <Table data={byMatch} cols={[{ label:'vs', key:'opponent', flex:1.5, lines:1, render:r=>`vs ${r.opponent}` },{ label:'Date', key:'match_date', flex:1.2, render:r=>fDate(r.match_date) },{ label:'Attend.', key:'attendance', flex:1, render:r=>(r.attendance||0).toLocaleString() },{ label:'Revenue', key:'ticket_revenue', flex:1.5, bold:true, render:r=>fKES(r.ticket_revenue) }]} />
          </View>
        )}
      </>
    );
  };

  const renderTickets = () => {
    if (!data) return null;
    const { byMatch = [], summary = [], totals = {} } = data;
    return (
      <>
        {totals && (
          <View style={s.card}>
            <Divider label="OVERALL TOTALS" />
            <View style={s.grid2}>
              <KpiCard label="TOTAL BOOKINGS" value={totals.total_bookings||0} accent={C.accent} />
              <KpiCard label="TOTAL TICKETS" value={(totals.total_tickets||0).toLocaleString()} />
              <KpiCard label="NET REVENUE" value={fKES(totals.net_revenue)} accent={C.green} />
              <KpiCard label="CONVERSION" value={`${totals.conversion_rate||0}%`} />
            </View>
          </View>
        )}
        {summary.length > 0 && (
          <View style={s.card}>
            <Divider label="BY TICKET TYPE" />
            <BarChart data={summary} labelKey="ticket_type" valueKey="paid_revenue" color={C.accent} formatValue={fKES} />
            <View style={s.grid2}>
              {summary.map((st,i) => <KpiCard key={i} label={(st.ticket_type||'').toUpperCase()} value={fKES(st.total_revenue)} sub={`${st.total_tickets||0} tickets · ${st.total_bookings||0} bookings`} />)}
            </View>
          </View>
        )}
        {byMatch.length > 0 && (
          <View style={s.card}>
            <Divider label="SALES BY MATCH" />
            <Table data={byMatch} cols={[{ label:'vs', flex:1.5, render:r=>`vs ${r.opponent}`, lines:1 },{ label:'Type', key:'ticket_type', flex:1, render:r=>(r.ticket_type||'—').charAt(0).toUpperCase()+(r.ticket_type||'').slice(1) },{ label:'Sold', key:'tickets_sold', flex:0.8 },{ label:'Paid', key:'paid_revenue', flex:1.5, bold:true, render:r=>fKES(r.paid_revenue) },{ label:'Conv%', key:'conversion_rate', flex:0.8, render:r=>`${r.conversion_rate||0}%` }]} />
          </View>
        )}
      </>
    );
  };

  const renderSeasonPerf = () => {
    if (!data) return null;
    const { statistics: st = {}, byVenue = [], monthlyForm = [], recentForm = [] } = data;
    return (
      <>
        <View style={s.card}>
          <Divider label="SEASON OVERVIEW" />
          <View style={s.ringRow}>
            <StatRing pct={st.win_percentage||0} label="WIN RATE" value={`${st.total_matches||0} matches`} color={C.green} />
          </View>
          <View style={s.grid3}>
            <KpiCard label="PLAYED" value={st.total_matches||0} accent={C.accent} />
            <KpiCard label="WINS" value={st.wins||0} accent={C.green} />
            <KpiCard label="DRAWS" value={st.draws||0} />
            <KpiCard label="LOSSES" value={st.losses||0} accent={C.red} />
            <KpiCard label="GOALS FOR" value={st.goals_scored||0} />
            <KpiCard label="GOALS AG." value={st.goals_conceded||0} />
            <KpiCard label="GOAL DIFF" value={st.goal_difference||0} accent={st.goal_difference>=0?C.green:C.red} />
          </View>
          {recentForm.length > 0 && (
            <View style={s.formRow}><Text style={s.formTitle}>LAST 5</Text><View style={s.formBeads}>{recentForm.map((r,i)=><FormPill key={i} r={r} />)}</View></View>
          )}
        </View>
        {byVenue.length > 0 && (
          <View style={s.card}>
            <Divider label="HOME vs AWAY RECORD" />
            <Table data={byVenue} cols={[{ label:'Venue', key:'venue', flex:1.5, render:r=>(r.venue||'').toUpperCase() },{ label:'P', key:'played', flex:0.8, bold:true },{ label:'W', key:'wins', flex:0.8 },{ label:'D', key:'draws', flex:0.8 },{ label:'L', key:'losses', flex:0.8 }]} />
          </View>
        )}
        {monthlyForm.length > 0 && (
          <View style={s.card}>
            <Divider label="MONTHLY WIN COUNT" />
            <BarChart data={[...monthlyForm].reverse()} labelKey="month" valueKey="wins" color={C.green} />
          </View>
        )}
      </>
    );
  };

  const renderPlayerPerf = () => {
    if (!data) return null;
    const { players = [], positionStats = [], discipline = {} } = data;
    return (
      <>
        {positionStats.length > 0 && (
          <View style={s.card}>
            <Divider label="SQUAD BY POSITION" />
            <BarChart data={positionStats} labelKey="position" valueKey="total_goals" color={C.accent} />
            <View style={s.grid2}>{positionStats.map((ps,i)=><KpiCard key={i} label={(ps.position||'').toUpperCase()} value={ps.player_count} sub={`${ps.total_goals||0} gls · ${ps.total_assists||0} ast · avg ${Number(ps.avg_age||0).toFixed(0)}y`} />)}</View>
          </View>
        )}
        <View style={s.card}>
          <Divider label="DISCIPLINE" />
          <View style={s.grid2}>
            <KpiCard label="YELLOW CARDS" value={discipline.total_yellows||0} sub={`Avg ${Number(discipline.avg_yellows||0).toFixed(1)} per player`} accent={C.accent} />
            <KpiCard label="RED CARDS" value={discipline.total_reds||0} sub={`Avg ${Number(discipline.avg_reds||0).toFixed(1)} per player`} accent={C.red} />
          </View>
        </View>
        {players.length > 0 && (
          <View style={s.card}>
            <Divider label="PLAYER STATS" />
            <Table data={players} cols={[{ label:'#', key:'jersey_number', flex:0.5 },{ label:'Name', key:'name', flex:2, lines:1 },{ label:'Pos', key:'position', flex:1 },{ label:'App', key:'appearances', flex:0.7 },{ label:'Gls', key:'goals', flex:0.7, bold:true },{ label:'Ast', key:'assists', flex:0.7 },{ label:'G/G', key:'goals_per_game', flex:0.7 }]} />
          </View>
        )}
      </>
    );
  };

  const renderSquadOverview = () => {
    if (!data) return null;
    const { squad = [], summary: st = {}, byPosition = [] } = data;
    return (
      <>
        <View style={s.card}>
          <Divider label="SQUAD SUMMARY" />
          <View style={s.grid2}>
            <KpiCard label="TOTAL PLAYERS" value={st.total_players||0} accent={C.accent} />
            <KpiCard label="AVERAGE AGE" value={`${Number(st.avg_age||0).toFixed(1)} yrs`} />
            <KpiCard label="TOTAL GOALS" value={st.total_goals||0} accent={C.green} />
            <KpiCard label="TOTAL ASSISTS" value={st.total_assists||0} />
            <KpiCard label="APPEARANCES" value={st.total_appearances||0} />
            <KpiCard label="DISCIPLINE" value={`${st.total_yellows||0}Y / ${st.total_reds||0}R`} />
          </View>
        </View>
        {byPosition.length > 0 && (
          <View style={s.card}>
            <Divider label="POSITION BREAKDOWN" />
            <BarChart data={byPosition} labelKey="position" valueKey="count" color={C.accent} />
            <Table data={byPosition} cols={[{ label:'Position', key:'position', flex:2, render:r=>(r.position||'').charAt(0).toUpperCase()+(r.position||'').slice(1) },{ label:'Count', key:'count', flex:1, bold:true },{ label:'Avg Age', key:'avg_age', flex:1, render:r=>`${Number(r.avg_age||0).toFixed(1)}y` },{ label:'Goals', key:'goals', flex:1 },{ label:'Assists', key:'assists', flex:1 }]} />
          </View>
        )}
        {squad.length > 0 && (
          <View style={s.card}>
            <Divider label="FULL ROSTER" />
            <Table data={squad} cols={[{ label:'#', key:'jersey_number', flex:0.5 },{ label:'Name', key:'name', flex:2, lines:1 },{ label:'Pos', key:'position', flex:1 },{ label:'Age', key:'age', flex:0.7 },{ label:'Gls', key:'goals', flex:0.7, bold:true },{ label:'App', key:'appearances', flex:0.7 }]} />
          </View>
        )}
      </>
    );
  };

  const renderTopScorers = () => {
    if (!data) return null;
    const { topScorers = [], topAssists = [] } = data;
    return (
      <>
        {topScorers.length > 0 && (
          <View style={s.card}>
            <Divider label="TOP GOAL SCORERS" />
            <BarChart data={topScorers} labelKey="name" valueKey="goals" color={C.accent} />
            <Table data={topScorers} cols={[{ label:'Rank', flex:0.6, render:(_,i)=>`${i+1}`, bold:true },{ label:'Name', key:'name', flex:2, lines:1 },{ label:'Pos', key:'position', flex:1 },{ label:'Gls', key:'goals', flex:0.7, bold:true },{ label:'Ast', key:'assists', flex:0.7 },{ label:'G/G', key:'goals_per_game', flex:0.7 }]} />
          </View>
        )}
        {topAssists.length > 0 && (
          <View style={s.card}>
            <Divider label="TOP ASSISTERS" />
            <BarChart data={topAssists} labelKey="name" valueKey="assists" color={C.accent} />
            <Table data={topAssists} cols={[{ label:'Rank', flex:0.6, render:(_,i)=>`${i+1}`, bold:true },{ label:'Name', key:'name', flex:2, lines:1 },{ label:'Pos', key:'position', flex:1 },{ label:'Ast', key:'assists', flex:0.7, bold:true },{ label:'Gls', key:'goals', flex:0.7 },{ label:'A/G', key:'assists_per_game', flex:0.7 }]} />
          </View>
        )}
      </>
    );
  };

  const renderAttendance = () => {
    if (!data) return null;
    const { matches = [], statistics: st = {}, byVenue = [], byCompetition = [] } = data;
    return (
      <>
        <View style={s.card}>
          <Divider label="ATTENDANCE STATISTICS" />
          <View style={s.grid2}>
            <KpiCard label="AVG ATTENDANCE" value={Math.round(st.avg_attendance||0).toLocaleString()} sub="Per match" accent={C.accent} />
            <KpiCard label="HIGHEST" value={(st.max_attendance||0).toLocaleString()} sub="Record crowd" accent={C.green} />
            <KpiCard label="LOWEST" value={(st.min_attendance||0).toLocaleString()} sub="Lowest crowd" />
            <KpiCard label="TOTAL" value={(st.total_attendance||0).toLocaleString()} sub={`${st.matches_with_data||0} matches`} />
          </View>
          {byVenue.length > 0 && <><Divider label="BY VENUE" /><BarChart data={byVenue} labelKey="venue" valueKey="avg_attendance" color={C.accent} /></>}
          {byCompetition.length > 0 && <><Divider label="BY COMPETITION" /><BarChart data={byCompetition} labelKey="competition" valueKey="avg_attendance" color={C.accent} /></>}
        </View>
        {matches.length > 0 && (
          <View style={s.card}>
            <Divider label="MATCH ATTENDANCE" />
            <Table data={matches} cols={[{ label:'vs', flex:1.5, render:r=>`vs ${r.opponent}`, lines:1 },{ label:'Date', key:'match_date', flex:1.3, render:r=>fDate(r.match_date) },{ label:'Venue', key:'venue', flex:1 },{ label:'Crowd', key:'attendance', flex:1.2, bold:true, render:r=>(r.attendance||0).toLocaleString() }]} />
          </View>
        )}
      </>
    );
  };

  const renderMembership = () => {
    if (!data) return null;
    const { memberships = [], statistics: st = {}, monthlyGrowth = [] } = data;
    return (
      <>
        <View style={s.card}>
          <Divider label="MEMBERSHIP OVERVIEW" />
          <View style={s.grid2}>
            <KpiCard label="TOTAL MEMBERS" value={st.total_members||0} sub="All time" accent={C.accent} />
            <KpiCard label="ACTIVE" value={st.active_members||0} sub="Valid" accent={C.green} />
            <KpiCard label="EXPIRED" value={st.expired_members||0} sub="Lapsed" accent={C.red} />
            <KpiCard label="EXPIRING SOON" value={st.expiring_soon||0} sub="Next 30 days" />
            <KpiCard label="NEW THIS MONTH" value={st.new_this_month||0} sub="Recent signups" />
            <KpiCard label="TOTAL REVENUE" value={fKES(st.total_revenue)} sub={`Avg ${fKES(st.avg_fee)}`} accent={C.accent} />
          </View>
        </View>
        {monthlyGrowth.length > 0 && (
          <View style={s.card}>
            <Divider label="MONTHLY GROWTH" />
            <BarChart data={[...monthlyGrowth].reverse()} labelKey="month" valueKey="new_members" color={C.green} />
          </View>
        )}
        {memberships.length > 0 && (
          <View style={s.card}>
            <Divider label="MEMBER LIST" />
            <Table data={memberships} cols={[{ label:'Name', key:'full_name', flex:2, lines:1 },{ label:'Status', flex:1, render:r=>r.days_until_expiry<0?'✗ EXP':'✓ ACT', bold:true },{ label:'Expiry', key:'expiry_date', flex:1.5, render:r=>fDate(r.expiry_date) },{ label:'Days', key:'days_until_expiry', flex:0.8, render:r=>r.days_until_expiry<0?`${Math.abs(r.days_until_expiry)}d ago`:`${r.days_until_expiry}d` }]} />
          </View>
        )}
      </>
    );
  };

  const renderContent = () => {
    if (loading) return <Loader />;
    if (!data) return <Empty />;
    switch (activeTab) {
      case 'executive': return renderExecutive();
      case 'revenue': return renderRevenue();
      case 'matchday-rev': return renderMatchDayRevenue();
      case 'tickets': return renderTickets();
      case 'season-perf': return renderSeasonPerf();
      case 'player-perf': return renderPlayerPerf();
      case 'squad-overview': return renderSquadOverview();
      case 'top-scorers': return renderTopScorers();
      case 'attendance': return renderAttendance();
      case 'membership': return renderMembership();
      default: return <Empty />;
    }
  };

  const renderFilters = () => {
    switch (activeTab) {
      case 'revenue':
        return <FilterSelect label="GROUP BY" value={revenueGroupBy} onChange={setRevenueGroupBy} items={[{ label:'Month', value:'month' },{ label:'Day', value:'day' },{ label:'Week', value:'week' },{ label:'Year', value:'year' }]} />;
      case 'season-perf':
        return <FilterSelect label="SEASON" value={matchSeason} onChange={setMatchSeason} items={[{ label:'All', value:'' },{ label:'2025', value:'2025' },{ label:'2024', value:'2024' }]} />;
      case 'player-perf':
        return <FilterSelect label="POSITION" value={playerPosition} onChange={setPlayerPosition} items={[{ label:'All', value:'' },{ label:'Goalkeeper', value:'goalkeeper' },{ label:'Defender', value:'defender' },{ label:'Midfielder', value:'midfielder' },{ label:'Forward', value:'forward' }]} />;
      case 'top-scorers':
        return <FilterSelect label="SHOW TOP" value={topLimit} onChange={setTopLimit} items={[{ label:'Top 5', value:'5' },{ label:'Top 10', value:'10' },{ label:'Top 20', value:'20' }]} />;
      case 'membership':
        return <FilterSelect label="STATUS" value={memberStatus} onChange={setMemberStatus} items={[{ label:'All Members', value:'all' },{ label:'Active Only', value:'active' },{ label:'Expired Only', value:'expired' }]} />;
      case 'executive':
        return <FilterSelect label="PERIOD" value={execPeriod} onChange={setExecPeriod} items={[{ label:'This Week', value:'week' },{ label:'This Month', value:'month' },{ label:'This Season', value:'season' },{ label:'All Time', value:'all' }]} />;
      default: return null;
    }
  };

  return (
    <LinearGradient colors={BG} style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}><Text style={s.backTxt}>← BACK</Text></TouchableOpacity>
        <Text style={s.logo}>FC INKIWANJANI</Text>
        <View style={s.navRight}><View style={s.roleBadge}><Text style={s.roleTxt}>{(user?.role||'').replace('_',' ').toUpperCase()}</Text></View></View>
      </View>
      {toast !== '' && <Animated.View style={[s.toast, { transform: [{ translateY: toastAnim }] }]}><Text style={s.toastTxt}>{toast}</Text></Animated.View>}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.page}>
          <View style={s.heading}><View><Text style={s.headTitle}>REPORTS & ANALYTICS</Text><View style={s.headBar} /></View><Text style={s.headSub}>Data insights across all club operations</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>
            {TABS.map(tab => <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={[s.tab, activeTab===tab.id && s.tabActive]}><Text style={[s.tabTxt, activeTab===tab.id && s.tabTxtActive]}>{tab.label}</Text></TouchableOpacity>)}
          </ScrollView>
          {renderFilters()}
          <View style={s.actionButtonsRow}>
            <TouchableOpacity onPress={loadReport} style={s.refreshBtn} disabled={loading}><Text style={s.refreshTxt}>↻ REFRESH</Text></TouchableOpacity>
            <TouchableOpacity onPress={exportPDF} style={[s.exportBtn, (loading || !data) && s.exportBtnDisabled]} disabled={loading || !data}><Text style={s.exportBtnText}>📋 EXPORT PDF</Text></TouchableOpacity>
          </View>
          {renderContent()}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── REUSABLE COMPONENTS (unchanged) ────────────────────────────────────────
const Divider = ({ label }) => <View style={s.divider}><Text style={s.dividerLabel}>{label}</Text><View style={s.dividerLine} /></View>;
const KpiCard = ({ label, value, sub, accent }) => <View style={[s.kpiCard, accent && { borderColor: accent, borderTopWidth: 2 }]}><Text style={s.kpiLabel}>{label}</Text><Text style={[s.kpiValue, accent && { color: accent }]}>{value}</Text>{sub && <Text style={s.kpiSub}>{sub}</Text>}</View>;
const TH = ({ cols }) => <View style={s.th}>{cols.map((c,i)=><Text key={i} style={[s.thCell,{flex:c.flex}]}>{c.label}</Text>)}</View>;
const TR = ({ cols, row, idx }) => <View style={[s.tr, idx%2===1 && s.trAlt]}>{cols.map((c,i)=>{ const val = c.render ? c.render(row) : String(row[c.key]??'—'); return <Text key={i} numberOfLines={c.lines||1} style={[s.td,{flex:c.flex}, c.bold && {color:C.accent,fontWeight:'700'}]}>{val}</Text>; })}</View>;
const Table = ({ cols, data }) => <View style={s.table}><TH cols={cols} />{data.map((row,i)=><TR key={i} cols={cols} row={row} idx={i} />)}</View>;
const Pill = ({ label, color, bg }) => <View style={[s.pill, { backgroundColor: bg || C.card }]}><Text style={[s.pillText, { color: color || C.text }]}>{label}</Text></View>;
const FormPill = ({ r }) => { const cfg = { W: C.green, D: C.amber, L: C.red }[r] || C.muted; return <View style={[s.formBead, { backgroundColor: cfg+'20', borderColor: cfg }]}><Text style={[s.formBeadText, { color: cfg }]}>{r}</Text></View>; };
const BarChart = ({ data, labelKey, valueKey, color = C.accent, formatValue }) => { if (!data?.length) return null; const max = Math.max(...data.map(d=>Number(d[valueKey]||0))); return <View style={s.barChart}>{data.map((d,i)=>{ const val=Number(d[valueKey]||0); const pctW=max>0?(val/max)*100:0; return <View key={i} style={s.barRow}><Text style={s.barLabel} numberOfLines={1}>{d[labelKey]}</Text><View style={s.barTrack}><View style={[s.barFill,{width:`${pctW}%`,backgroundColor:color}]} /></View><Text style={[s.barValue,{color}]}>{formatValue?formatValue(val):val.toLocaleString()}</Text></View>; })}</View>; };
const StatRing = ({ pct: p, label, value, color = C.accent }) => <View style={s.ringWrap}><View style={[s.ringOuter,{borderColor:color+'33'}]}><View style={[s.ringInner,{borderColor:color}]}><Text style={[s.ringPct,{color}]}>{p}%</Text></View></View><Text style={s.ringValue}>{value}</Text><Text style={s.ringLabel}>{label}</Text></View>;
const Empty = ({ msg = 'No data available for this report.' }) => <View style={s.emptyBox}><Text style={s.emptyIcon}>📊</Text><Text style={s.emptyText}>{msg}</Text></View>;
const Loader = () => <View style={s.loaderBox}><ActivityIndicator color={C.accent} size="large" /><Text style={s.loaderText}>Loading report…</Text></View>;
const FilterSelect = ({ label, value, onChange, items }) => <View style={s.filterGroup}><Text style={s.filterLabel}>{label}</Text><View style={s.pickerBox}><Picker selectedValue={value} onValueChange={onChange} style={s.picker} dropdownIconColor={C.accent}>{items.map(it=><Picker.Item key={it.value} label={it.label} value={it.value} color={C.text} />)}</Picker></View></View>;

const s = StyleSheet.create({
  root: { flex: 1 },
  nav: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:10, backgroundColor:'rgba(255,255,255,0.9)', borderRadius:14, marginHorizontal:12, marginVertical:8, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, shadowOffset:{width:0,height:2}, elevation:2, gap:10 },
  backBtn: { borderWidth:1, borderColor:C.border2, borderRadius:14, paddingHorizontal:10, paddingVertical:4 },
  backTxt: { color:C.muted, fontWeight:'700', fontSize:10, letterSpacing:0.8 },
  logo: { flex:1, fontSize:14, fontWeight:'900', color:C.accent, letterSpacing:0.5 },
  navRight: { flexDirection:'row', alignItems:'center', gap:8 },
  roleBadge: { backgroundColor:C.card2, borderWidth:1, borderColor:C.border, borderRadius:14, paddingHorizontal:7, paddingVertical:3 },
  roleTxt: { color:C.navy, fontSize:9, fontWeight:'700', letterSpacing:0.8 },
  toast: { position:'absolute', top:80, left:16, right:16, zIndex:9999, backgroundColor:C.accent, borderRadius:10, paddingVertical:10, paddingHorizontal:16, elevation:4, shadowColor:C.accent, shadowOpacity:0.3, shadowRadius:6, shadowOffset:{width:0,height:2} },
  toastTxt: { color:C.white, fontWeight:'700', fontSize:13, textAlign:'center' },
  page: { padding:16 },
  heading: { marginBottom:16 },
  headTitle: { fontSize:15, fontWeight:'900', color:C.navy, letterSpacing:2 },
  headBar: { width:40, height:2, backgroundColor:C.accent, marginTop:5, marginBottom:4 },
  headSub: { fontSize:12, color:C.secText },
  tabScroll: { maxHeight:36 },
  tab: { paddingVertical:6, paddingHorizontal:13, borderWidth:1, borderColor:C.border2, borderRadius:4, backgroundColor:C.white, marginRight:6 },
  tabActive: { backgroundColor:C.accent, borderColor:C.accent },
  tabTxt: { color:C.muted, fontWeight:'700', fontSize:11 },
  tabTxtActive: { color:C.white },
  filterGroup: { marginBottom:8 },
  filterLabel: { fontSize:10, fontWeight:'700', color:C.accent, letterSpacing:1.5, marginBottom:4 },
  pickerBox: { borderWidth:1.5, borderColor:C.border, borderRadius:12, backgroundColor:C.inputBg, overflow:'hidden' },
  picker: { color:C.navy, backgroundColor:C.inputBg },
  actionButtonsRow: { flexDirection:'row', gap:8, marginBottom:14 },
  refreshBtn: { flex:1, borderWidth:1.5, borderColor:C.accent, borderRadius:12, paddingVertical:12, alignItems:'center', backgroundColor:C.white },
  refreshTxt: { color:C.accent, fontWeight:'700', fontSize:11, letterSpacing:1 },
  exportBtn: { flex:1.2, backgroundColor:C.accent, borderRadius:12, paddingVertical:12, alignItems:'center', shadowColor:C.accent, shadowOpacity:0.25, shadowRadius:6, shadowOffset:{width:0,height:2}, elevation:2 },
  exportBtnDisabled: { opacity:0.5, borderColor:C.border2 },
  exportBtnText: { color:C.white, fontWeight:'700', fontSize:10, letterSpacing:0.5 },
  card: { backgroundColor:C.card, borderRadius:14, borderWidth:1, borderColor:C.border, padding:14, marginBottom:14, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:8, shadowOffset:{width:0,height:2}, elevation:1 },
  divider: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:14, marginTop:4 },
  dividerLabel: { fontSize:10, fontWeight:'800', color:C.accent, letterSpacing:1.5, flexShrink:0 },
  dividerLine: { flex:1, height:1, backgroundColor:C.border2 },
  grid2: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:4 },
  grid3: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:4 },
  kpiCard: { backgroundColor:C.card, padding:12, borderRadius:8, minWidth:130, flex:1, borderWidth:1, borderColor:C.border, borderTopWidth:2, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, shadowOffset:{width:0,height:1}, elevation:1 },
  kpiLabel: { fontSize:10, color:C.muted, fontWeight:'700', marginBottom:4, letterSpacing:0.8 },
  kpiValue: { fontSize:17, fontWeight:'800', color:C.accent, marginBottom:2 },
  kpiSub: { fontSize:10, color:C.textDim },
  table: { backgroundColor:C.white, borderRadius:8, overflow:'hidden', borderWidth:1, borderColor:C.border },
  th: { flexDirection:'row', backgroundColor:C.cardAlt, paddingVertical:7, paddingHorizontal:10 },
  thCell: { color:C.navy, fontWeight:'800', fontSize:10, letterSpacing:0.5 },
  tr: { flexDirection:'row', borderBottomWidth:1, borderBottomColor:C.border, paddingVertical:7, paddingHorizontal:10, alignItems:'center' },
  trAlt: { backgroundColor:'#FAFBFC' },
  td: { color:C.secText, fontSize:12 },
  barChart: { marginBottom:12, gap:6 },
  barRow: { flexDirection:'row', alignItems:'center', gap:6 },
  barLabel: { width:80, fontSize:10, color:C.muted, textTransform:'capitalize' },
  barTrack: { flex:1, height:6, backgroundColor:C.border, borderRadius:3, overflow:'hidden' },
  barFill: { height:6, borderRadius:3 },
  barValue: { width:70, fontSize:10, fontWeight:'700', textAlign:'right' },
  ringWrap: { alignItems:'center' },
  ringOuter: { width:90, height:90, borderRadius:45, borderWidth:6, alignItems:'center', justifyContent:'center' },
  ringInner: { width:70, height:70, borderRadius:35, borderWidth:4, alignItems:'center', justifyContent:'center' },
  ringPct: { fontSize:18, fontWeight:'900' },
  ringValue: { fontSize:11, color:C.secText, marginTop:6 },
  ringLabel: { fontSize:10, color:C.muted, fontWeight:'700', letterSpacing:1 },
  formRow: { flexDirection:'row', alignItems:'center', gap:10, marginTop:12, flexWrap:'wrap' },
  formTitle: { fontSize:10, fontWeight:'800', color:C.accent, letterSpacing:1.5 },
  formBeads: { flexDirection:'row', gap:5, flexWrap:'wrap' },
  formBead: { width:28, height:28, borderRadius:5, borderWidth:1.5, alignItems:'center', justifyContent:'center' },
  formBeadText: { fontSize:11, fontWeight:'900' },
  pill: { borderRadius:4, paddingHorizontal:6, paddingVertical:2 },
  pillText: { fontSize:9, fontWeight:'800', letterSpacing:0.5 },
  fixtureRow: { flexDirection:'row', alignItems:'center', paddingVertical:10, paddingHorizontal:10, borderBottomWidth:1, borderBottomColor:C.border, gap:8 },
  fixtureOpp: { fontSize:13, fontWeight:'700', color:C.navy },
  fixtureMeta: { fontSize:10, color:C.muted, marginTop:2 },
  newsRow: { paddingVertical:9, paddingHorizontal:10, borderBottomWidth:1, borderBottomColor:C.border },
  newsTitle: { fontSize:12, fontWeight:'600', color:C.secText },
  newsMeta: { fontSize:10, color:C.muted, marginTop:2 },
  emptyBox: { alignItems:'center', paddingVertical:40 },
  emptyIcon: { fontSize:32, marginBottom:10 },
  emptyText: { color:C.textDim, fontSize:13, textAlign:'center' },
  loaderBox: { alignItems:'center', paddingVertical:40, gap:12 },
  loaderText: { color:C.muted, fontSize:13 },
});