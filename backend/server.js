// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB (uses your src/config/database.js)
const db = require('./src/config/database');

// Routes
app.use('/api/news', require('./src/routes/news'));
app.use('/api/matches', require('./src/routes/matches'));
app.use('/api/stats', require('./src/routes/stats'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FC Inkiwanjani API is running',
    timestamp: new Date().toISOString()
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🐺 Welcome to FC Inkiwanjani API',
    team: 'The Wolves - Pride of Mile 46'
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start server after DB check
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    // Try to get a connection from promisePool to ensure DB is reachable
    const conn = await db.promisePool.getConnection();
    conn.release();
    console.log('✅ Database connection successful!');
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🐺 FC INKIWANJANI API');
      console.log('='.repeat(50));
      console.log(`🚀 Server: http://localhost:${PORT}`);
      console.log(`🔗 Health: http://localhost:${PORT}/health`);
      console.log('='.repeat(50) + '\n');
    });
  } catch (err) {
    console.error('❌ Database connection failed:', err.message || err);
    process.exit(1);
  }
})();
