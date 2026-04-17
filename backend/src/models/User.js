// backend/src/models/User.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;
const ALLOWED_ROLES = ['user'];

const VALIDATION = {
  username: { min: 3, max: 50, pattern: /^[a-zA-Z0-9_]+$/ },
  email:    { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { min: 8, max: 128 },
  fullName: { min: 2, max: 100 },
};

const validateCreate = ({ username, email, password, full_name }) => {
  const u = (username || '').trim();
  const e = (email || '').trim().toLowerCase();
  const p = password || '';
  const n = (full_name || '').trim();

  if (!u || !e || !p || !n) {
    throw new Error('All fields are required: username, email, password, full_name');
  }
  if (u.length < VALIDATION.username.min || u.length > VALIDATION.username.max) {
    throw new Error(`Username must be ${VALIDATION.username.min}–${VALIDATION.username.max} characters`);
  }
  if (!VALIDATION.username.pattern.test(u)) {
    throw new Error('Username may only contain letters, numbers, and underscores');
  }
  if (!VALIDATION.email.pattern.test(e)) {
    throw new Error('Invalid email address');
  }
  if (p.length < VALIDATION.password.min || p.length > VALIDATION.password.max) {
    throw new Error(`Password must be ${VALIDATION.password.min}–${VALIDATION.password.max} characters`);
  }
  if (n.length < VALIDATION.fullName.min || n.length > VALIDATION.fullName.max) {
    throw new Error(`Full name must be ${VALIDATION.fullName.min}–${VALIDATION.fullName.max} characters`);
  }

  return { username: u, email: e, password: p, full_name: n };
};

class User {

  static async create({ username, email, password, full_name, phone }) {
    const clean = validateCreate({ username, email, password, full_name });

    try {
      const password_hash = await bcrypt.hash(clean.password, BCRYPT_ROUNDS);

      const [result] = await pool.execute(
        `INSERT INTO users (username, email, password_hash, full_name, phone)
         VALUES (?, ?, ?, ?, ?)`,
        [clean.username, clean.email, password_hash, clean.full_name, phone || null]
      );

      return {
        userID: result.insertId,
        username: clean.username,
        email: clean.email,
        full_name: clean.full_name,
        phone: phone || null,
      };
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
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

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE LIMIT 1',
      [email]
    );
    return rows[0] || null;
  }

  static async findByUsername(username) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE LIMIT 1',
      [username]
    );
    return rows[0] || null;
  }

  static async findById(userID) {
    const [rows] = await pool.execute(
      `SELECT userID, username, email, full_name, phone, last_login, created_at
       FROM users
       WHERE userID = ? AND is_active = TRUE
       LIMIT 1`,
      [userID]
    );
    return rows[0] || null;
  }

  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT userID, username, email, full_name, phone, last_login, created_at
       FROM users
       WHERE is_active = TRUE
       ORDER BY created_at DESC`
    );
    return rows;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(userID) {
    await pool.execute('UPDATE users SET last_login = NOW() WHERE userID = ?', [userID]);
    return true;
  }

  static async updateProfile(userID, { full_name, phone }) {
    await pool.execute(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone)
       WHERE userID = ? AND is_active = TRUE`,
      [full_name ?? null, phone ?? null, userID]
    );
    return this.findById(userID);
  }

  static async deactivate(userID) {
    await pool.execute(
      'UPDATE users SET is_active = FALSE WHERE userID = ?',
      [userID]
    );
    return true;
  }

  // ─── Add changePassword method ───
  static async changePassword(userID, { current_password, new_password }) {
    if (!userID || !current_password || !new_password) {
      throw new Error('User ID, current password, and new password are required');
    }

    const user = await this.findById(userID);
    if (!user) throw new Error('User not found');

    const [rows] = await pool.execute(
      'SELECT password_hash FROM users WHERE userID = ? AND is_active = TRUE LIMIT 1',
      [userID]
    );
    if (!rows[0]) throw new Error('User not found');

    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) throw new Error('Current password is incorrect');

    const new_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.execute('UPDATE users SET password_hash = ? WHERE userID = ?', [new_hash, userID]);

    return true;
  }
}

module.exports = User;