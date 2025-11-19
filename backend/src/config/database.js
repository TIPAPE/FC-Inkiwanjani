// db.js
const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool for better performance and reliability
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'inkiwanjani_app',
  password: process.env.DB_PASS || 'InkiApp@2025',
  database: process.env.DB_NAME || 'fc_inkiwanjani',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Use the promise-based interface for async/await queries
const promisePool = pool.promise();

// Test database connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);

    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 Solution: Make sure MySQL server is running.');
      console.error('   ▸ Windows: Open Services → Start "MySQL" service');
      console.error('   ▸ Linux/Mac: Run `sudo service mysql start` or `brew services start mysql`');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Solution: Check DB_USER and DB_PASS in your .env file.');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Solution: Database not found. Run your SQL setup script first.');
    }

    process.exit(1); // Stop the app if DB connection fails
  } else {
    console.log('✅ Database connection successful!');
    connection.release();
  }
});

// Export query function for convenience
const query = async (sql, params = []) => {
  try {
    const [rows] = await promisePool.query(sql, params);
    return rows;
  } catch (err) {
    console.error('❌ SQL Query Error:', err.message);
    throw err;
  }
};

module.exports = { pool, promisePool, query };
