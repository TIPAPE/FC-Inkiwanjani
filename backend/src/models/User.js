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
        id: result.insertId,
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
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, username, email, full_name, phone, last_login, created_at, updated_at
       FROM users
       WHERE id = ? AND is_active = TRUE
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  // Get all active users (admin use)
  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT id, username, email, full_name, phone, last_login, created_at, updated_at
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
  static async updateLastLogin(id) {
    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
    return true;
  }

  // Update basic profile details (optional future use)
  static async updateProfile(id, { full_name, phone }) {
    await pool.execute(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND is_active = TRUE`,
      [full_name ?? null, phone ?? null, id]
    );

    return this.findById(id);
  }

  // Soft delete / deactivate account
  static async deactivate(id) {
    await pool.execute(
      'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return true;
  }
}

module.exports = User;
