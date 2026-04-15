// backend/src/controllers/adminController.js
const Player = require('../models/Player');
const Match = require('../models/Match');
const News = require('../models/News');
const Booking = require('../models/Booking');
const Revenue = require('../models/Revenue');
const Settings = require('../models/Settings');
const { parsePagination, sendPaginated } = require('../utils/pagination');

// Helpers

const sendError = (res, status, message, extra = undefined) => {
  return res.status(status).json({
    success: false,
    message,
    ...(extra ? { ...extra } : {}),
  });
};

const sendSuccess = (res, status, message, data) => {
  return res.status(status).json({
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  });
};

const toInt = (value) => {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
};

const toFloat = (value) => {
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
};

const safeTrim = (v) => (typeof v === 'string' ? v.trim() : v);

const isValidId = (id) => {
  const n = toInt(id);
  return n !== null && n > 0;
};

const isValidDateTime = (v) => {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return true;
  return /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(s);
};

const isValidDate = (v) => {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
};

// Schema enums
const PLAYER_POSITIONS  = new Set(['goalkeeper', 'defender', 'midfielder', 'forward']);
const MATCH_VENUES      = new Set(['home', 'away']);
const MATCH_COMPETITIONS = new Set(['league', 'cup', 'friendly']);
const NEWS_CATEGORIES   = new Set(['match-report', 'transfer', 'announcement', 'community']);
const REVENUE_SOURCES   = new Set(['tickets', 'merchandise', 'membership', 'sponsorship', 'other']);

const PLAYER_AGE_MIN = 15;
const PLAYER_AGE_MAX = 55;

// Player management

exports.getAllPlayers = async (req, res) => {
  try {
    const players = await Player.getAll();
    return sendSuccess(res, 200, null, players);
  } catch (error) {
    console.error('Get players error:', error);
    return sendError(res, 500, 'Failed to fetch players');
  }
};

/**
 * POST /api/admin/players
 * Creates a new player record. matchID is optional.
 */
exports.addPlayer = async (req, res) => {
  try {
    const name          = safeTrim(req.body?.name);
    const jersey_number = toInt(req.body?.jersey_number);
    const position      = safeTrim(req.body?.position);
    const age           = toInt(req.body?.age);
    const matchID       = req.body?.matchID ? toInt(req.body.matchID) : null;

    if (!name || jersey_number === null || !position || age === null) {
      return sendError(res, 400, 'All fields are required: name, jersey_number, position, age');
    }
    if (name.length < 2 || name.length > 100) {
      return sendError(res, 400, 'Player name must be between 2 and 100 characters');
    }
    if (jersey_number < 1 || jersey_number > 99) {
      return sendError(res, 400, 'Jersey number must be between 1 and 99');
    }
    if (!PLAYER_POSITIONS.has(position)) {
      return sendError(res, 400, 'Invalid position', { allowed: Array.from(PLAYER_POSITIONS) });
    }
    if (age < PLAYER_AGE_MIN || age > PLAYER_AGE_MAX) {
      return sendError(res, 400, `Player age must be between ${PLAYER_AGE_MIN} and ${PLAYER_AGE_MAX}`);
    }

    const player = await Player.create({ name, jersey_number, position, age, matchID });
    return sendSuccess(res, 201, 'Player added successfully', player);
  } catch (error) {
    console.error('Add player error:', error);
    if (String(error?.message || '').toLowerCase().includes('duplicate')) {
      return sendError(res, 400, 'Jersey number already in use. Choose a different number.');
    }
    return sendError(res, 500, 'Failed to add player');
  }
};

/**
 * PUT /api/admin/players/:id/stats
 * Updates statistical counters for a player. All stat fields default to 0 if omitted.
 */
exports.updatePlayerStats = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, 'Invalid player id');

    const existing = await Player.getById(id);
    if (!existing) return sendError(res, 404, 'Player not found');

    const goals        = req.body?.goals        !== undefined ? toInt(req.body.goals)        : 0;
    const assists      = req.body?.assists      !== undefined ? toInt(req.body.assists)      : 0;
    const appearances  = req.body?.appearances  !== undefined ? toInt(req.body.appearances)  : 0;
    const yellow_cards = req.body?.yellow_cards !== undefined ? toInt(req.body.yellow_cards) : 0;
    const red_cards    = req.body?.red_cards    !== undefined ? toInt(req.body.red_cards)    : 0;

    const stats = { goals, assists, appearances, yellow_cards, red_cards };
    for (const [key, value] of Object.entries(stats)) {
      if (value === null)  return sendError(res, 400, `Invalid number for ${key}`);
      if (value < 0)       return sendError(res, 400, `${key} cannot be negative`);
      if (value > 9999)    return sendError(res, 400, `${key} value is too large (max 9999)`);
    }

    const player = await Player.updateStats(id, stats);
    return sendSuccess(res, 200, 'Player stats updated successfully', player);
  } catch (error) {
    console.error('Update player stats error:', error);
    return sendError(res, 500, error.message || 'Failed to update player stats');
  }
};

/**
 * DELETE /api/admin/players/:id
 * Permanently removes a player record.
 */
exports.deletePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, 'Invalid player id');

    const existing = await Player.getById(id);
    if (!existing) return sendError(res, 404, 'Player not found');

    await Player.delete(id);
    return sendSuccess(res, 200, 'Player removed successfully');
  } catch (error) {
    console.error('Delete player error:', error);
    return sendError(res, 500, 'Failed to remove player');
  }
};

/**
 * GET /api/admin/players/top?limit=5
 * Returns the top-scoring players up to the specified limit (1–50).
 */
exports.getTopPerformers = async (req, res) => {
  try {
    const limitRaw = req.query.limit;
    const limit = limitRaw ? toInt(limitRaw) : 5;
    if (limit === null || limit < 1 || limit > 50) {
      return sendError(res, 400, 'Invalid limit (1–50)');
    }
    const players = await Player.getTopScorers(limit);
    return sendSuccess(res, 200, null, players);
  } catch (error) {
    console.error('Get top performers error:', error);
    return sendError(res, 500, 'Failed to fetch top performers');
  }
};

// ================== MATCH MANAGEMENT ==================

/**
 * GET /api/admin/matches
 * Returns all matches.
 */
exports.getAllMatches = async (req, res) => {
  try {
    const matches = await Match.getAll();
    return sendSuccess(res, 200, null, matches);
  } catch (error) {
    console.error('Get matches error:', error);
    return sendError(res, 500, 'Failed to fetch matches');
  }
};

/**
 * GET /api/admin/matches/upcoming
 * Returns all scheduled upcoming matches.
 */
exports.getUpcomingMatches = async (req, res) => {
  try {
    const matches = await Match.getUpcoming();
    return sendSuccess(res, 200, null, matches);
  } catch (error) {
    console.error('Get upcoming matches error:', error);
    return sendError(res, 500, 'Failed to fetch upcoming matches');
  }
};

/**
 * GET /api/admin/matches/completed
 * Returns completed matches up to the specified limit (1–100, default 10).
 */
exports.getCompletedMatches = async (req, res) => {
  try {
    const limitRaw = req.query.limit;
    const limit = limitRaw ? toInt(limitRaw) : 10;
    if (limit === null || limit < 1 || limit > 100) {
      return sendError(res, 400, 'Invalid limit (1–100)');
    }
    const matches = await Match.getCompleted(limit);
    return sendSuccess(res, 200, null, matches);
  } catch (error) {
    console.error('Get completed matches error:', error);
    return sendError(res, 500, 'Failed to fetch completed matches');
  }
};

/**
 * POST /api/admin/matches
 * Creates a new match fixture.
 */
exports.addMatch = async (req, res) => {
  try {
    const opponent    = safeTrim(req.body?.opponent);
    const match_date  = safeTrim(req.body?.match_date);
    const venue       = safeTrim(req.body?.venue);
    const competition = safeTrim(req.body?.competition);

    if (!opponent || !match_date || !venue || !competition) {
      return sendError(res, 400, 'All fields are required: opponent, match_date, venue, competition');
    }
    if (opponent.length < 2 || opponent.length > 100) {
      return sendError(res, 400, 'Opponent name must be between 2 and 100 characters');
    }
    if (!isValidDateTime(match_date)) {
      return sendError(res, 400, 'Invalid match_date. Use format: YYYY-MM-DD HH:MM:SS');
    }
    if (!MATCH_VENUES.has(venue)) {
      return sendError(res, 400, 'Invalid venue', { allowed: Array.from(MATCH_VENUES) });
    }
    if (!MATCH_COMPETITIONS.has(competition)) {
      return sendError(res, 400, 'Invalid competition', { allowed: Array.from(MATCH_COMPETITIONS) });
    }

    const match = await Match.create({ opponent, match_date, venue, competition });
    return sendSuccess(res, 201, 'Match added successfully', match);
  } catch (error) {
    console.error('Add match error:', error);
    return sendError(res, 500, 'Failed to add match');
  }
};

/**
 * PUT /api/admin/matches/:id/result
 * Records the final result for a completed match.
 * Cancelled matches are rejected — results cannot be recorded for them.
 */
exports.updateMatchResult = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, 'Invalid match id');

    const existing = await Match.getById(id);
    if (!existing) return sendError(res, 404, 'Match not found');

    if (existing.status === 'cancelled') {
      return sendError(res, 400, 'Cannot update result for a cancelled match');
    }

    const home_score     = toInt(req.body?.home_score);
    const away_score     = toInt(req.body?.away_score);
    const summary        = safeTrim(req.body?.summary) || null;
    const attendanceRaw  = req.body?.attendance;
    const attendance     = (attendanceRaw === null || attendanceRaw === undefined)
      ? null
      : toInt(attendanceRaw);

    if (home_score === null || away_score === null) {
      return sendError(res, 400, 'Both home_score and away_score are required');
    }
    if (home_score < 0 || away_score < 0) {
      return sendError(res, 400, 'Scores cannot be negative');
    }
    if (home_score > 99 || away_score > 99) {
      return sendError(res, 400, 'Score value is unrealistic (max 99)');
    }
    if (attendance !== null) {
      if (attendance < 0)       return sendError(res, 400, 'Attendance cannot be negative');
      if (attendance > 200000)  return sendError(res, 400, 'Attendance value is too large');
    }

    const match = await Match.updateResult(id, { home_score, away_score, summary, attendance });
    return sendSuccess(res, 200, 'Match result updated successfully', match);
  } catch (error) {
    console.error('Update match result error:', error);
    return sendError(res, 500, error.message || 'Failed to update match result');
  }
};

/**
 * DELETE /api/admin/matches/:id
 * Permanently removes a match record.
 */
exports.deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, 'Invalid match id');

    const existing = await Match.getById(id);
    if (!existing) return sendError(res, 404, 'Match not found');

    await Match.delete(id);
    return sendSuccess(res, 200, 'Match deleted successfully');
  } catch (error) {
    console.error('Delete match error:', error);
    return sendError(res, 500, 'Failed to delete match');
  }
};

// ================== NEWS MANAGEMENT ==================

/**
 * GET /api/admin/news
 * Returns all news articles.
 */
exports.getAllNews = async (req, res) => {
  try {
    const news = await News.getAll();
    return sendSuccess(res, 200, null, news);
  } catch (error) {
    console.error('Get news error:', error);
    return sendError(res, 500, 'Failed to fetch news');
  }
};

/**
 * POST /api/admin/news
 * Publishes a new news article. Excerpt is auto-generated from content if not provided.
 * Author defaults to 'FC Inkiwanjani' if omitted.
 */
exports.addNews = async (req, res) => {
  try {
    const adminUserID     = req.user.id;
    const title           = safeTrim(req.body?.title);
    const category        = safeTrim(req.body?.category) || 'announcement';
    const excerpt         = safeTrim(req.body?.excerpt);
    const content         = safeTrim(req.body?.content);
    const author          = safeTrim(req.body?.author) || 'FC Inkiwanjani';
    const published_date  = safeTrim(req.body?.published_date) || new Date().toISOString().slice(0, 10);

    if (!title || !content) {
      return sendError(res, 400, 'Title and content are required');
    }
    if (title.length < 3 || title.length > 255) {
      return sendError(res, 400, 'Title must be between 3 and 255 characters');
    }
    if (!NEWS_CATEGORIES.has(category)) {
      return sendError(res, 400, 'Invalid category', { allowed: Array.from(NEWS_CATEGORIES) });
    }
    if (!isValidDate(published_date)) {
      return sendError(res, 400, 'Invalid published_date. Use "YYYY-MM-DD"');
    }

    const safeExcerpt = excerpt && excerpt.length > 0
      ? excerpt
      : content.length > 200
        ? `${content.substring(0, 200)}...`
        : content;

    const news = await News.create({
      adminUserID,
      title,
      category,
      excerpt: safeExcerpt,
      content,
      author,
      published_date,
    });
    return sendSuccess(res, 201, 'News article published successfully', news);
  } catch (error) {
    console.error('Add news error:', error);
    return sendError(res, 500, 'Failed to publish news article');
  }
};

/**
 * PUT /api/admin/news/:id
 * Partially updates a news article. Only fields present in the request body are changed.
 */
exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, 'Invalid news id');

    const existing = await News.getById(id);
    if (!existing) return sendError(res, 404, 'News article not found');

    const title    = req.body?.title    !== undefined ? safeTrim(req.body.title)    : undefined;
    const category = req.body?.category !== undefined ? safeTrim(req.body.category) : undefined;
    const excerpt  = req.body?.excerpt  !== undefined ? safeTrim(req.body.excerpt)  : undefined;
    const content  = req.body?.content  !== undefined ? safeTrim(req.body.content)  : undefined;
    const author   = req.body?.author   !== undefined ? safeTrim(req.body.author)   : undefined;

    if (category !== undefined && category !== '' && !NEWS_CATEGORIES.has(category)) {
      return sendError(res, 400, 'Invalid category', { allowed: Array.from(NEWS_CATEGORIES) });
    }
    if (title !== undefined && title !== '' && (title.length < 3 || title.length > 255)) {
      return sendError(res, 400, 'Title must be between 3 and 255 characters');
    }

    const news = await News.update(id, { title, category, excerpt, content, author });
    return sendSuccess(res, 200, 'News article updated successfully', news);
  } catch (error) {
    console.error('Update news error:', error);
    return sendError(res, 500, error.message || 'Failed to update news article');
  }
};

/**
 * DELETE /api/admin/news/:id
 * Permanently removes a news article.
 */
exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, 'Invalid news id');

    const existing = await News.getById(id);
    if (!existing) return sendError(res, 404, 'News article not found');

    await News.delete(id);
    return sendSuccess(res, 200, 'News article deleted successfully');
  } catch (error) {
    console.error('Delete news error:', error);
    return sendError(res, 500, 'Failed to delete news article');
  }
};

// ================== BOOKING MANAGEMENT ==================

/**
 * GET /api/admin/bookings
 * Returns all booking records.
 */
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.getAll();
    console.log('[Admin Bookings] Returning', bookings.length, 'bookings');
    if (bookings.length > 0) {
      bookings.forEach((b, i) => {
        console.log(`  [${i}] ID: ${b.bookingID}, Ref: ${b.booking_reference || '(null)'}, Status: ${b.payment_status}, Match: ${b.opponent || 'unknown'}, Match Status: ${b.match_status || 'unknown'}`);
      });
    }
    return sendSuccess(res, 200, null, bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    return sendError(res, 500, 'Failed to fetch bookings');
  }
};

/**
 * GET /api/admin/bookings/stats
 * Returns aggregated booking statistics.
 */
exports.getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.getStats();
    return sendSuccess(res, 200, null, stats);
  } catch (error) {
    console.error('Get booking stats error:', error);
    return sendError(res, 500, 'Failed to fetch booking statistics');
  }
};

/**
 * GET /api/admin/bookings/revenue-by-match
 * Returns booking revenue grouped by match.
 */
exports.getRevenueByMatch = async (req, res) => {
  try {
    const revenue = await Booking.getRevenueByMatch();
    return sendSuccess(res, 200, null, revenue);
  } catch (error) {
    console.error('Get revenue by match error:', error);
    return sendError(res, 500, 'Failed to fetch revenue by match');
  }
};

// ================== REVENUE MANAGEMENT ==================

/**
 * GET /api/admin/revenue
 * Returns a revenue summary, optionally filtered by start_date and end_date (YYYY-MM-DD).
 */
exports.getRevenueSummary = async (req, res) => {
  try {
    const start_date = req.query?.start_date ? safeTrim(req.query.start_date) : undefined;
    const end_date   = req.query?.end_date   ? safeTrim(req.query.end_date)   : undefined;

    if (start_date && !isValidDate(start_date)) {
      return sendError(res, 400, 'Invalid start_date. Use "YYYY-MM-DD"');
    }
    if (end_date && !isValidDate(end_date)) {
      return sendError(res, 400, 'Invalid end_date. Use "YYYY-MM-DD"');
    }

    const summary = await Revenue.getSummary(start_date, end_date);
    return sendSuccess(res, 200, null, summary);
  } catch (error) {
    console.error('Get revenue summary error:', error);
    return sendError(res, 500, 'Failed to fetch revenue summary');
  }
};

/**
 * POST /api/admin/revenue
 * Records a new revenue transaction. bookingID is optional.
 */
exports.addRevenue = async (req, res) => {
  try {
    const bookingID       = req.body?.bookingID ? toInt(req.body.bookingID) : null;
    const source          = safeTrim(req.body?.source);
    const amount          = toFloat(req.body?.amount);
    const description     = safeTrim(req.body?.description) || null;
    const transaction_date = safeTrim(req.body?.transaction_date) || new Date().toISOString().slice(0, 10);

    if (!source || amount === null) {
      return sendError(res, 400, 'Source and amount are required');
    }
    if (!REVENUE_SOURCES.has(source)) {
      return sendError(res, 400, 'Invalid source', { allowed: Array.from(REVENUE_SOURCES) });
    }
    if (amount <= 0) {
      return sendError(res, 400, 'Amount must be greater than 0');
    }
    if (amount > 100000000) {
      return sendError(res, 400, 'Amount is unrealistically large');
    }
    if (!isValidDate(transaction_date)) {
      return sendError(res, 400, 'Invalid transaction_date. Use "YYYY-MM-DD"');
    }

    const revenue = await Revenue.create({ bookingID, source, amount, description, transaction_date });
    return sendSuccess(res, 201, 'Revenue record added successfully', revenue);
  } catch (error) {
    console.error('Add revenue error:', error);
    return sendError(res, 500, 'Failed to add revenue record');
  }
};

/**
 * GET /api/admin/revenue/monthly?year=YYYY&month=M
 * Returns revenue breakdown for a specific month.
 */
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const year  = toInt(req.query?.year);
    const month = toInt(req.query?.month);

    if (year === null || month === null) {
      return sendError(res, 400, 'Year and month are required query parameters');
    }
    if (year < 2000 || year > 2100)  return sendError(res, 400, 'Year must be between 2000 and 2100');
    if (month < 1   || month > 12)   return sendError(res, 400, 'Month must be between 1 and 12');

    const revenue = await Revenue.getMonthlyRevenue(year, month);
    return sendSuccess(res, 200, null, revenue);
  } catch (error) {
    console.error('Get monthly revenue error:', error);
    return sendError(res, 500, 'Failed to fetch monthly revenue');
  }
};

// ================== SETTINGS MANAGEMENT ==================

/**
 * GET /api/admin/settings
 * Returns all application settings.
 */
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await Settings.getAll();
    return sendSuccess(res, 200, null, settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return sendError(res, 500, 'Failed to fetch settings');
  }
};

/**
 * GET /api/admin/settings/ticket-prices
 * Returns current ticket prices for all categories.
 */
exports.getTicketPrices = async (req, res) => {
  try {
    const prices = await Settings.getTicketPrices();
    return sendSuccess(res, 200, null, prices);
  } catch (error) {
    console.error('Get ticket prices error:', error);
    return sendError(res, 500, 'Failed to fetch ticket prices');
  }
};

/**
 * PUT /api/admin/settings/ticket-prices
 * Updates ticket prices for all three tiers: vip, regular, student.
 */
exports.updateTicketPrices = async (req, res) => {
  try {
    const adminUserID = req.user.id;
    const vip     = toInt(req.body?.vip);
    const regular = toInt(req.body?.regular);
    const student = toInt(req.body?.student);

    if (vip === null || regular === null || student === null) {
      return sendError(res, 400, 'All ticket prices are required: vip, regular, student');
    }
    if (vip < 0 || regular < 0 || student < 0) {
      return sendError(res, 400, 'Ticket prices cannot be negative');
    }
    if (vip > 1000000 || regular > 1000000 || student > 1000000) {
      return sendError(res, 400, 'Ticket price is unrealistically large');
    }

    await Settings.setTicketPrices({ vip, regular, student }, adminUserID);
    return sendSuccess(res, 200, 'Ticket prices updated successfully', { vip, regular, student });
  } catch (error) {
    console.error('Update ticket prices error:', error);
    return sendError(res, 500, 'Failed to update ticket prices');
  }
};

/**
 * PUT /api/admin/settings/membership-fee
 * Updates the club membership fee.
 */
exports.updateMembershipFee = async (req, res) => {
  try {
    const adminUserID = req.user.id;
    const fee = toInt(req.body?.fee);

    if (fee === null) {
      return sendError(res, 400, 'Membership fee is required');
    }
    if (fee <= 0) {
      return sendError(res, 400, 'Membership fee must be greater than 0');
    }
    if (fee > 1000000) {
      return sendError(res, 400, 'Membership fee is unrealistically large');
    }

    await Settings.setMembershipFee(fee, adminUserID);
    return sendSuccess(res, 200, 'Membership fee updated successfully', { membership_fee: fee });
  } catch (error) {
    console.error('Update membership fee error:', error);
    return sendError(res, 500, 'Failed to update membership fee');
  }
};

/**
 * GET /api/admin/dashboard/stats
 * Aggregates all dashboard data in a single parallel request.
 * Returns players, matches, bookings, revenue, ticket prices, and top performers.
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      players,
      upcomingMatches,
      completedMatches,
      bookingStats,
      revenueSummary,
      ticketPrices,
      topPerformers,
    ] = await Promise.all([
      Player.getAll(),
      Match.getUpcoming(),
      Match.getCompleted(5),
      Booking.getStats(),
      Revenue.getSummary(),
      Settings.getTicketPrices(),
      Player.getTopScorers(5),
    ]);

    return sendSuccess(res, 200, null, {
      players: {
        total: players.length,
        list: players,
      },
      matches: {
        upcoming: upcomingMatches.length,
        upcomingList: upcomingMatches,
        recentResults: completedMatches,
      },
      bookings: bookingStats,
      revenue: revenueSummary,
      ticketPrices,
      topPerformers,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return sendError(res, 500, 'Failed to fetch dashboard statistics');
  }
};

/**
 * GET /api/admin/admins
 * Returns all admin accounts (safe fields only).
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const AdminUser = require('../models/AdminUser');
    const admins = await AdminUser.findAll();
    return sendSuccess(res, 200, null, admins);
  } catch (error) {
    console.error('Get admins error:', error);
    return sendError(res, 500, 'Failed to fetch admin accounts');
  }
};

/**
 * POST /api/admin/admins
 * Creates a new admin account. Super_admin only.
 */
exports.createAdmin = async (req, res) => {
  try {
    const AdminUser = require('../models/AdminUser');
    const { username, email, password, full_name, role } = req.body;
    const admin = await AdminUser.create({ username, email, password, full_name, role });
    return sendSuccess(res, 201, 'Admin account created successfully', admin);
  } catch (error) {
    console.error('Create admin error:', error);
    return sendError(res, 400, error.message || 'Failed to create admin account');
  }
};

/**
 * DELETE /api/admin/admins/:id
 * Soft-deletes (deactivates) an admin account. Cannot delete super_admin.
 */
exports.deleteAdmin = async (req, res) => {
  try {
    const AdminUser = require('../models/AdminUser');
    const { id } = req.params;
    if (!id || isNaN(Number(id))) return sendError(res, 400, 'Invalid admin ID');
    await AdminUser.deactivate(Number(id));
    return sendSuccess(res, 200, 'Admin account deleted successfully');
  } catch (error) {
    console.error('Delete admin error:', error);
    return sendError(res, 400, error.message || 'Failed to delete admin account');
  }
};