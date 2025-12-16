// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();

// ========================
// MIDDLEWARE
// ========================
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*', // '*' is safe for React Native
    credentials: true,
  })
);
app.use(compression());
app.use(morgan('combined')); // 'combined' for production logs
app.use(express.json({ limit: '10mb' })); // Support file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically (for images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========================
// DATABASE CONNECTION
// ========================
const db = require('./src/config/database');

// ========================
// ROUTES - FULL API SURFACE
// ========================
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/players', require('./src/routes/playerRoutes'));
app.use('/api/matches', require('./src/routes/matchRoutes'));
app.use('/api/bookings', require('./src/routes/bookingRoutes'));
app.use('/api/news', require('./src/routes/newsRoutes'));
app.use('/api/revenue', require('./src/routes/revenueRoutes'));
app.use('/api/gallery', require('./src/routes/galleryRoutes'));
app.use('/api/comments', require('./src/routes/commentRoutes'));
app.use('/api/polls', require('./src/routes/pollRoutes'));
app.use('/api/memberships', require('./src/routes/membershipRoutes'));
app.use('/api/settings', require('./src/routes/settingsRoutes'));

// ========================
// HEALTH & ROOT ENDPOINTS
// ========================
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FC Inkiwanjani API is operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    team: 'FC Inkiwanjani',
    nickname: 'The Wolves',
    motto: 'The Pride of Mile 46',
    api_version: '1.0.0',
    endpoints: '/api/{auth,players,matches,bookings,news,revenue,gallery,comments,polls,memberships,settings}',
  });
});

// ========================
// ERROR HANDLING
// ========================
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The route ${req.method} ${req.originalUrl} does not exist.`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  // Default to 500 if no status
  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    // Verify DB connectivity
    const connection = await db.promisePool.getConnection();
    connection.release();
    console.log('✅ Database connection verified.');

    // Start server
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🐺 FC INKIWANJANI - OFFICIAL API SERVER');
      console.log('='.repeat(60));
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📂 Uploads served at: http://localhost:${PORT}/uploads`);
      console.log('='.repeat(60) + '\n');
    });
  } catch (error) {
    console.error('❌ FATAL: Failed to connect to database.');
    console.error('Message:', error.message);
    console.error('\n💡 Ensure MySQL is running and credentials are correct in .env');
    process.exit(1);
  }
})();