// backend/src/config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// ================= ENV VALIDATION =================
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

// ================= CREATE CONNECTION POOL =================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT
    ? parseInt(process.env.DB_CONNECTION_LIMIT)
    : 10,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  timezone: 'Z', // Store dates in UTC

  ssl: process.env.DB_SSL === 'true'
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

// ================= CONNECTION TEST =================
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1); // Fail fast in production
  }
})();

// ================= GRACEFUL SHUTDOWN =================
const shutdown = async () => {
  try {
    console.log('🔄 Closing database connection pool...');
    await pool.end();
    console.log('✅ Database pool closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = pool;
