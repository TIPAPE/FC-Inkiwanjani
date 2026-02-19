// backend/src/routes/publicRoutes.js
const express = require('express');
const router = express.Router();

const Player = require('../models/Player');
const Match = require('../models/Match');
const News = require('../models/News');
const Settings = require('../models/Settings');
const Booking = require('../models/Booking');

// ================== HELPERS ==================
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

// Schema enums (match your DB constraints)
const NEWS_CATEGORIES = new Set(['match-report', 'transfer', 'announcement', 'community']);
const PLAYER_POSITIONS = new Set(['goalkeeper', 'defender', 'midfielder', 'forward']);
const TICKET_TYPES = new Set(['vip', 'regular', 'student']);

// ================== NEWS ROUTES (Public) ==================

// IMPORTANT: Put specific routes BEFORE /news/:id to avoid collisions

// Get latest news
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

// Get all published news
router.get('/news', async (req, res) => {
  try {
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

// ================== MATCH ROUTES (Public) ==================

// Get next match
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

// Get all matches
router.get('/matches', async (req, res) => {
  try {
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

// ================== PLAYER ROUTES (Public) ==================
// IMPORTANT: Put specific routes BEFORE /players/:id to avoid collisions

// Get top scorers
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

// Get all players
router.get('/players', async (req, res) => {
  try {
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

// ================== SETTINGS ROUTES (Public) ==================

// Get ticket prices
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

// ================== BOOKINGS ROUTES (Public) ==================

// Create a booking (public)
router.post('/bookings', async (req, res) => {
  try {
    const match_id = toInt(req.body?.match_id);
    const customer_name = safeTrim(req.body?.customer_name);
    const customer_email = safeTrim(req.body?.customer_email)?.toLowerCase();
    const customer_phone = safeTrim(req.body?.customer_phone);
    const ticket_type = safeTrim(req.body?.ticket_type);
    const quantity = toInt(req.body?.quantity);

    if (
      match_id === null ||
      !customer_name ||
      !customer_email ||
      !customer_phone ||
      !ticket_type ||
      quantity === null
    ) {
      return sendError(res, 400, 'All fields are required: match_id, customer_name, customer_email, customer_phone, ticket_type, quantity');
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
    const match = await Match.getById(match_id);
    if (!match) {
      return sendError(res, 404, 'Match not found');
    }

    // Calculate total on server (don’t trust frontend)
    const prices = await Settings.getTicketPrices();
    const unitPrice = toFloat(prices?.[ticket_type]);

    if (unitPrice === null) {
      return sendError(res, 500, 'Ticket pricing misconfigured on server');
    }

    const total_amount = unitPrice * quantity;

    const booking = await Booking.create({
      match_id,
      customer_name,
      customer_email,
      customer_phone,
      ticket_type,
      quantity,
      total_amount,
    });

    return sendSuccess(res, 201, booking, 'Booking created successfully');
  } catch (error) {
    console.error('Create booking error:', error);
    return sendError(res, 500, 'Failed to create booking');
  }
});

// Get bookings for a customer (public) — PRODUCTION SAFE MODE
// Require ?email= so we don’t expose all bookings publicly
router.get('/bookings', async (req, res) => {
  try {
    const email = safeTrim(req.query?.email)?.toLowerCase();

    if (!email) {
      return sendError(res, 400, 'Missing required query param: email', []);
    }

    if (!isValidEmail(email)) {
      return sendError(res, 400, 'Invalid email', []);
    }

    // If your Booking model doesn’t have getByEmail yet,
    // keep getAll() for now BUT FILTER HERE so we don’t leak data.
    const bookings = await Booking.getAll();
    const filtered = Array.isArray(bookings)
      ? bookings.filter((b) => (b.customer_email || '').toLowerCase() === email)
      : [];

    return sendSuccess(res, 200, filtered);
  } catch (error) {
    console.error('Get bookings error:', error);
    return sendError(res, 500, 'Failed to fetch bookings', []);
  }
});

module.exports = router;
