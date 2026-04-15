// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Custom JSON parsing middleware that handles errors gracefully
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      // Log the error but don't break the request
      console.warn('JSON parsing error (ignored):', err.message);
      // Clear the body and continue
      req.body = {};
    }
    next();
  });
});

app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Cache-Control for public GET endpoints
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api')) {
    if (
      req.path.startsWith('/api/news') ||
      req.path.startsWith('/api/matches') ||
      req.path.startsWith('/api/players') ||
      req.path.startsWith('/api/settings') ||
      req.path.startsWith('/api/gallery') ||
      req.path.startsWith('/api/comments') ||
      req.path.startsWith('/api/polls')
    ) {
      res.set('Cache-Control', 'public, max-age=300');
    }
  }
  next();
});

// Test database connection
require('./src/config/database');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const publicRoutes = require('./src/routes/publicRoutes');

// API Routes
app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'FC Inkiwanjani API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      public: '/api',
      health: '/api/health'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'FC Inkiwanjani API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'FC Inkiwanjani API Documentation',
    version: '1.0.0',
    routes: {
      public: {
        news: {
          'GET /api/news': 'Get all news',
          'GET /api/news/latest?limit=5': 'Get latest news',
          'GET /api/news/:id': 'Get news by ID',
          'GET /api/news/category/:category': 'Get news by category'
        },
        matches: {
          'GET /api/matches': 'Get all matches',
          'GET /api/matches/next': 'Get next match',
          'GET /api/matches/last': 'Get last completed match',
          'GET /api/matches/upcoming': 'Get upcoming matches',
          'GET /api/matches/completed?limit=10': 'Get completed matches',
          'GET /api/matches/:id': 'Get match by ID'
        },
        players: {
          'GET /api/players': 'Get all players',
          'GET /api/players/:id': 'Get player by ID',
          'GET /api/players/top/scorers?limit=5': 'Get top scorers',
          'GET /api/players/position/:position': 'Get players by position'
        },
        settings: {
          'GET /api/settings/ticket-prices': 'Get ticket prices',
          'GET /api/settings/club-info': 'Get club information'
        }
      },
      auth: {
        'POST /api/auth/login': 'Login user or admin',
        'POST /api/auth/signup/user': 'Register new user',
        'POST /api/auth/signup/admin': 'Register new admin',
        'GET /api/auth/verify': 'Verify JWT token',
        'GET /api/auth/profile': 'Get user profile'
      },
      admin: {
        players: {
          'GET /api/admin/players': 'Get all players',
          'POST /api/admin/players': 'Add new player',
          'PUT /api/admin/players/:id/stats': 'Update player stats',
          'DELETE /api/admin/players/:id': 'Delete player',
          'GET /api/admin/players/top-performers': 'Get top performers'
        },
        matches: {
          'GET /api/admin/matches': 'Get all matches',
          'GET /api/admin/matches/upcoming': 'Get upcoming matches',
          'GET /api/admin/matches/completed': 'Get completed matches',
          'POST /api/admin/matches': 'Add new match',
          'PUT /api/admin/matches/:id/result': 'Update match result',
          'DELETE /api/admin/matches/:id': 'Delete match'
        },
        news: {
          'GET /api/admin/news': 'Get all news',
          'POST /api/admin/news': 'Add news article',
          'PUT /api/admin/news/:id': 'Update news article',
          'DELETE /api/admin/news/:id': 'Delete news article'
        },
        bookings: {
          'GET /api/admin/bookings': 'Get all bookings',
          'GET /api/admin/bookings/stats': 'Get booking statistics',
          'GET /api/admin/bookings/revenue-by-match': 'Get revenue by match'
        },
        revenue: {
          'GET /api/admin/revenue/summary': 'Get revenue summary',
          'GET /api/admin/revenue/monthly?year=2025&month=1': 'Get monthly revenue',
          'POST /api/admin/revenue': 'Add revenue record'
        },
        settings: {
          'GET /api/admin/settings': 'Get all settings',
          'GET /api/admin/settings/ticket-prices': 'Get ticket prices',
          'PUT /api/admin/settings/ticket-prices': 'Update ticket prices',
          'PUT /api/admin/settings/membership-fee': 'Update membership fee'
        },
        dashboard: {
          'GET /api/admin/dashboard/stats': 'Get dashboard statistics'
        }
      }
    },
    authentication: {
      description: 'Admin routes require JWT token in Authorization header',
      format: 'Bearer YOUR_JWT_TOKEN',
      example: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    availableEndpoints: {
      documentation: '/api/docs',
      health: '/api/health',
      public: '/api',
      auth: '/api/auth',
      admin: '/api/admin'
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\nFC INKIWANJANI API Server - ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`Docs: http://localhost:${PORT}/api/docs\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received: closing server');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', promise, 'reason:', reason);
});

module.exports = app;