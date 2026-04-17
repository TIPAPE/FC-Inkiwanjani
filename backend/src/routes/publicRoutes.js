// Public routes
const express = require('express');
const router = express.Router();

const Player = require('../models/player');
const Match = require('../models/match');
const News = require('../models/news');
const Settings = require('../models/settings');
const Booking = require('../models/booking');
const Gallery = require('../models/Gallery');
const db = require('../config/database');
const auth = require('../middleware/auth');
const { parsePagination, buildPaginatedResponse, sendPaginated } = require('../utils/pagination');

const galleryController = require('../controllers/galleryController');
const commentsController = require('../controllers/commentsController');
const pollsController = require('../controllers/pollsController');
const membershipsController = require('../controllers/membershipsController');
const { bookingLimiter, commentLimiter, pollLimiter } = require('../middleware/rateLimiter');

// Helper utilities
const sendError = (res, status, message, data = undefined) => {
  return res.status(status).json({
    success: false,
    message,
    ...(data !== undefined ? { data } : {}),
  });
};

const sendSuccess = (res, status, data, message = undefined) => {
  return res.status(status).json({
    success: true,
    ...(message ? { message } : {}),
    data,
  });
};

const safeTrim = (v) => (typeof v === 'string' ? v.trim() : v);

const toInt = (value) => {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
};

const toFloat = (value) => {
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
};

const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
};

const isValidId = (id) => {
  const n = toInt(id);
  return n !== null && n > 0;
};

// Allowed enum values
const NEWS_CATEGORIES = new Set(['match-report', 'transfer', 'announcement', 'community']);
const PLAYER_POSITIONS = new Set(['goalkeeper', 'defender', 'midfielder', 'forward']);
const TICKET_TYPES = new Set(['vip', 'regular', 'student']);

// News routes
router.get('/news/latest', async (req, res) => {
  try {
    const limit = req.query.limit ? toInt(req.query.limit) : 5;
    if (limit === null || limit < 1 || limit > 50) {
      return sendError(res, 400, 'Invalid limit (1 - 50)', []);
    }

    const news = await News.getLatest(limit);
    return sendSuccess(res, 200, news);
  } catch (error) {
    console.error('Get latest news error:', error);
    return sendError(res, 500, 'Failed to fetch latest news', []);
  }
});

// Get news by category
router.get('/news/category/:category', async (req, res) => {
  try {
    const category = safeTrim(req.params.category);

    if (!category || !NEWS_CATEGORIES.has(category)) {
      return sendError(res, 400, 'Invalid category', {
        allowed: Array.from(NEWS_CATEGORIES),
      });
    }

    const news = await News.getByCategory(category);
    return sendSuccess(res, 200, news);
  } catch (error) {
    console.error('Get news by category error:', error);
    return sendError(res, 500, 'Failed to fetch news', []);
  }
});

// Get all published news (with pagination)
router.get('/news', async (req, res) => {
  try {
    // Use pagination if requested
    const usePagination = req.query.page || req.query.limit;

    if (usePagination) {
      const { page, limit, offset } = parsePagination(req.query, { maxLimit: 100 });
      const [news, totalCount] = await Promise.all([
        News.getAllPaginated(offset, limit),
        News.getCount(),
      ]);
      return sendPaginated(res, 200, news, totalCount, page, limit);
    }

    const news = await News.getAll();
    return sendSuccess(res, 200, news);
  } catch (error) {
    console.error('Get news error:', error);
    return sendError(res, 500, 'Failed to fetch news', []);
  }
});

// Get news by ID
router.get('/news/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendError(res, 400, 'Invalid news id');
    }

    const article = await News.getById(id);

    if (!article) {
      return sendError(res, 404, 'News article not found');
    }

    return sendSuccess(res, 200, article);
  } catch (error) {
    console.error('Get news by ID error:', error);
    return sendError(res, 500, 'Failed to fetch news article');
  }
});

// Search news
router.get('/news/search', async (req, res) => {
  try {
    const q = safeTrim(req.query?.q);
    if (!q || q.length < 2) {
      return sendError(res, 400, 'Search query must be at least 2 characters', []);
    }
    const results = await News.search(q);
    return sendSuccess(res, 200, results);
  } catch (error) {
    console.error('Search news error:', error);
    return sendError(res, 500, 'Failed to search news', []);
  }
});

// Match routes
router.get('/matches/next', async (req, res) => {
  try {
    const match = await Match.getNext();
    return sendSuccess(res, 200, match);
  } catch (error) {
    console.error('Get next match error:', error);
    return sendError(res, 500, 'Failed to fetch next match', null);
  }
});

// Get last completed match
router.get('/matches/last', async (req, res) => {
  try {
    const match = await Match.getLastCompleted();
    return sendSuccess(res, 200, match);
  } catch (error) {
    console.error('Get last match error:', error);
    return sendError(res, 500, 'Failed to fetch last match', null);
  }
});

// Get upcoming matches
router.get('/matches/upcoming', async (req, res) => {
  try {
    const matches = await Match.getUpcoming();
    return sendSuccess(res, 200, matches);
  } catch (error) {
    console.error('Get upcoming matches error:', error);
    return sendError(res, 500, 'Failed to fetch upcoming matches', []);
  }
});

// Get completed matches
router.get('/matches/completed', async (req, res) => {
  try {
    const limit = req.query.limit ? toInt(req.query.limit) : 10;
    if (limit === null || limit < 1 || limit > 100) {
      return sendError(res, 400, 'Invalid limit (1 - 100)', []);
    }

    const matches = await Match.getCompleted(limit);
    return sendSuccess(res, 200, matches);
  } catch (error) {
    console.error('Get completed matches error:', error);
    return sendError(res, 500, 'Failed to fetch completed matches', []);
  }
});

// Get all matches (with pagination)
router.get('/matches', async (req, res) => {
  try {
    // Use pagination if requested
    const usePagination = req.query.page || req.query.limit;

    if (usePagination) {
      const { page, limit, offset } = parsePagination(req.query, { maxLimit: 200 });
      const [matches, totalCount] = await Promise.all([
        Match.getAllPaginated(offset, limit),
        Match.getCount(),
      ]);
      return sendPaginated(res, 200, matches, totalCount, page, limit);
    }

    const matches = await Match.getAll();
    return sendSuccess(res, 200, matches);
  } catch (error) {
    console.error('Get matches error:', error);
    return sendError(res, 500, 'Failed to fetch matches', []);
  }
});

// Get match by ID
router.get('/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendError(res, 400, 'Invalid match id');
    }

    const match = await Match.getById(id);

    if (!match) {
      return sendError(res, 404, 'Match not found');
    }

    return sendSuccess(res, 200, match);
  } catch (error) {
    console.error('Get match by ID error:', error);
    return sendError(res, 500, 'Failed to fetch match');
  }
});

// Player routes
router.get('/players/top/scorers', async (req, res) => {
  try {
    const limit = req.query.limit ? toInt(req.query.limit) : 5;
    if (limit === null || limit < 1 || limit > 50) {
      return sendError(res, 400, 'Invalid limit (1 - 50)', []);
    }

    const players = await Player.getTopScorers(limit);
    return sendSuccess(res, 200, players);
  } catch (error) {
    console.error('Get top scorers error:', error);
    return sendError(res, 500, 'Failed to fetch top scorers', []);
  }
});

// Get players by position
router.get('/players/position/:position', async (req, res) => {
  try {
    const position = safeTrim(req.params.position);

    if (!position || !PLAYER_POSITIONS.has(position)) {
      return sendError(res, 400, 'Invalid position', {
        allowed: Array.from(PLAYER_POSITIONS),
      });
    }

    const players = await Player.getByPosition(position);
    return sendSuccess(res, 200, players);
  } catch (error) {
    console.error('Get players by position error:', error);
    return sendError(res, 500, 'Failed to fetch players', []);
  }
});

// Get all players (with pagination)
router.get('/players', async (req, res) => {
  try {
    // Use pagination if requested
    const usePagination = req.query.page || req.query.limit;

    if (usePagination) {
      const { page, limit, offset } = parsePagination(req.query, { maxLimit: 100 });
      const [players, totalCount] = await Promise.all([
        Player.getAllPaginated(offset, limit),
        Player.getCount(),
      ]);
      return sendPaginated(res, 200, players, totalCount, page, limit);
    }

    const players = await Player.getAll();
    return sendSuccess(res, 200, players);
  } catch (error) {
    console.error('Get players error:', error);
    return sendError(res, 500, 'Failed to fetch players', []);
  }
});

// Get player by ID
router.get('/players/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendError(res, 400, 'Invalid player id');
    }

    const player = await Player.getById(id);

    if (!player) {
      return sendError(res, 404, 'Player not found');
    }

    return sendSuccess(res, 200, player);
  } catch (error) {
    console.error('Get player by ID error:', error);
    return sendError(res, 500, 'Failed to fetch player');
  }
});

// Settings routes
router.get('/settings/ticket-prices', async (req, res) => {
  try {
    const prices = await Settings.getTicketPrices();
    return sendSuccess(res, 200, prices);
  } catch (error) {
    console.error('Get ticket prices error:', error);
    return sendError(res, 500, 'Failed to fetch ticket prices', { vip: 0, regular: 0, student: 0 });
  }
});

// Get club info
router.get('/settings/club-info', async (req, res) => {
  try {
    const info = await Settings.getClubInfo();
    return sendSuccess(res, 200, info);
  } catch (error) {
    console.error('Get club info error:', error);
    return sendError(res, 500, 'Failed to fetch club info', {});
  }
});

// Get membership fee
router.get('/settings/membership-fee', async (req, res) => {
  try {
    const fee = await Settings.getMembershipFee();
    return sendSuccess(res, 200, { membership_fee: fee });
  } catch (error) {
    console.error('Get membership fee error:', error);
    return sendError(res, 500, 'Failed to fetch membership fee', { membership_fee: 0 });
  }
});

// Booking routes
router.post('/bookings', bookingLimiter, async (req, res) => {
  try {
    const matchID = toInt(req.body?.matchID || req.body?.match_id);
    const customer_name = safeTrim(req.body?.customer_name);
    const customer_email = safeTrim(req.body?.customer_email)?.toLowerCase();
    const customer_phone = safeTrim(req.body?.customer_phone);
    const ticket_type = safeTrim(req.body?.ticket_type);
    const quantity = toInt(req.body?.quantity);

    const userID = req.user?.id || null;

    if (
      matchID === null ||
      !customer_name ||
      !customer_email ||
      !customer_phone ||
      !ticket_type ||
      quantity === null
    ) {
      return sendError(res, 400, 'All fields are required: matchID, customer_name, customer_email, customer_phone, ticket_type, quantity');
    }

    if (!isValidEmail(customer_email)) {
      return sendError(res, 400, 'Invalid customer_email');
    }

    if (!TICKET_TYPES.has(ticket_type)) {
      return sendError(res, 400, 'Invalid ticket_type', { allowed: Array.from(TICKET_TYPES) });
    }

    if (quantity < 1 || quantity > 50) {
      return sendError(res, 400, 'Quantity must be between 1 and 50');
    }

    // Ensure match exists
    const match = await Match.getById(matchID);
    if (!match) {
      return sendError(res, 404, 'Match not found');
    }

    // Calculate total on server (don't trust frontend)
    const prices = await Settings.getTicketPrices();
    const unitPrice = toFloat(prices?.[ticket_type]);

    if (unitPrice === null) {
      return sendError(res, 500, 'Ticket pricing misconfigured on server');
    }

    const total_amount = unitPrice * quantity;

    const booking = await Booking.create({
      matchID,
      userID,
      customer_name,
      customer_email,
      customer_phone,
      ticket_type,
      quantity,
      total_amount,
    });

    // Auto-create revenue record for ticket sales
    const transaction_date = new Date().toISOString().slice(0, 10);
    await db.query(
      `INSERT INTO revenue (bookingID, source, amount, description, transaction_date)
       VALUES (?, 'tickets', ?, ?, ?)`,
      [booking.bookingID, total_amount, `Ticket sale: ${quantity}x ${ticket_type} for ${customer_name}`, transaction_date]
    ).catch((e) => console.error('Auto-revenue creation failed (non-fatal):', e));

    return sendSuccess(res, 201, booking, 'Booking created successfully');
  } catch (error) {
    console.error('Create booking error:', error);
    return sendError(res, 500, 'Failed to create booking');
  }
});

// Get bookings for a customer (public)
router.get('/bookings', async (req, res) => {
  try {
    const email = safeTrim(req.query?.email)?.toLowerCase();

    if (!email) {
      return sendError(res, 400, 'Missing required query param: email', []);
    }

    if (!isValidEmail(email)) {
      return sendError(res, 400, 'Invalid email', []);
    }

    console.log('[Bookings] Fetching bookings for email:', email);
    const bookings = await Booking.getByEmail(email);
    console.log('[Bookings] Found', bookings.length, 'bookings');
    if (bookings.length > 0) {
      bookings.forEach((b, i) => {
        console.log(`  [${i}] bookingID: ${b.bookingID}, booking_reference: ${b.booking_reference || '(null)'}`);
      });
    }

    return sendSuccess(res, 200, bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    return sendError(res, 500, 'Failed to fetch bookings', []);
  }
});

// Gallery routes
router.get('/gallery', galleryController.getAll);

// Get gallery item by ID
router.get('/gallery/:id', galleryController.getById);

// Get gallery items by match
router.get('/gallery/match/:matchID', galleryController.getByMatch);

// Comment routes
router.get('/comments', commentsController.getAll);

// Post a new comment
router.post('/comments', commentLimiter, commentsController.create);

// Poll routes
router.get('/polls/active', pollsController.getActivePoll);

// Get poll results
router.get('/polls/:id/results', pollsController.getPollResults);

// Cast a vote
router.post('/polls/:id/vote', pollLimiter, pollsController.vote);

// Membership routes
router.post('/memberships', membershipsController.create);

module.exports = router;
