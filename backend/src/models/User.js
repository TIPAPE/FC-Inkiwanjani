// backend/src/models/User.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create new user
  static async create({ username, email, password, full_name, phone }) {
    if (!username || !email || !password || !full_name) {
      throw new Error('Missing required fields');
    }

    try {
      const password_hash = await bcrypt.hash(password, 10);

      const [result] = await pool.execute(
        `INSERT INTO users (username, email, password_hash, full_name, phone)
         VALUES (?, ?, ?, ?, ?)`,
        [username, email, password_hash, full_name, phone || null]
      );

      return {
        userID: result.insertId,  // ✅ CHANGED: id → userID
        username,
        email,
        full_name,
        phone: phone || null,
      };
    } catch (error) {
      // Handle duplicate keys nicely
      if (error && error.code === 'ER_DUP_ENTRY') {
        // MySQL duplicate message contains key info
        if (String(error.message).includes('users.username')) {
          throw new Error('Username already taken');
        }
        if (String(error.message).includes('users.email')) {
          throw new Error('Email already registered');
        }
        throw new Error('Duplicate entry');
      }

      throw error;
    }
  }

  // Find user by email (includes password_hash for login verification)
  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE LIMIT 1',
      [email]
    );
    return rows[0] || null;
  }

  // Find user by username
  static async findByUsername(username) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE LIMIT 1',
      [username]
    );
    return rows[0] || null;
  }

  // Find user by ID (safe fields only)
  static async findById(userID) {  // ✅ CHANGED: parameter id → userID
    const [rows] = await pool.execute(
      `SELECT userID, username, email, full_name, phone, last_login, created_at  
       FROM users
       WHERE userID = ? AND is_active = TRUE
       LIMIT 1`,
      [userID]  // ✅ CHANGED: id → userID
    );
    return rows[0] || null;
  }

  // Get all active users (admin use)
  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT userID, username, email, full_name, phone, last_login, created_at  
       FROM users
       WHERE is_active = TRUE
       ORDER BY created_at DESC`
    );
    return rows;
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update last login
  static async updateLastLogin(userID) {  // ✅ CHANGED: parameter id → userID
    await pool.execute('UPDATE users SET last_login = NOW() WHERE userID = ?', [userID]);  // ✅ CHANGED
    return true;
  }

  // Update basic profile details (optional future use)
  static async updateProfile(userID, { full_name, phone }) {  // ✅ CHANGED: parameter id → userID
    await pool.execute(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone)
       WHERE userID = ? AND is_active = TRUE`,  // ✅ CHANGED: id → userID, removed updated_at
      [full_name ?? null, phone ?? null, userID]  // ✅ CHANGED
    );

    return this.findById(userID);  // ✅ CHANGED
  }

  // Soft delete / deactivate account
  static async deactivate(userID) {  // ✅ CHANGED: parameter id → userID
    await pool.execute(
      'UPDATE users SET is_active = FALSE WHERE userID = ?',  // ✅ CHANGED: removed updated_at
      [userID]  // ✅ CHANGED
    );
    return true;
  }
}

module.exports = User;