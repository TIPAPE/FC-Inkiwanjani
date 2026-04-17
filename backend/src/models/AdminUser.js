// backend/src/models/AdminUser.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;
const ALLOWED_ROLES = ['super_admin', 'admin', 'editor'];

const VALIDATION = {
  username: { min: 3, max: 50, pattern: /^[a-zA-Z0-9_]+$/ },
  email:    { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { min: 8, max: 128 },
  fullName: { min: 2, max: 100 },
};

const stripHash = (row) => {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
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

class AdminUser {

  static async create({ username, email, password, full_name, role } = {}) {
    const clean = validateCreate({ username, email, password, full_name });

    if (role !== undefined && role !== null && !ALLOWED_ROLES.includes(role)) {
      throw new Error(`Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`);
    }
    const finalRole = role && ALLOWED_ROLES.includes(role) ? role : 'editor';

    try {
      const password_hash = await bcrypt.hash(clean.password, BCRYPT_ROUNDS);

      const [result] = await pool.execute(
        `INSERT INTO admin_users (username, email, password_hash, full_name, role)
         VALUES (?, ?, ?, ?, ?)`,
        [clean.username, clean.email, password_hash, clean.full_name, finalRole]
      );

      return {
        adminUserID: result.insertId,
        username: clean.username,
        email: clean.email,
        full_name: clean.full_name,
        role: finalRole,
      };
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        if (String(error.message).includes('username')) throw new Error('Username already taken');
        if (String(error.message).includes('email'))    throw new Error('Email already registered');
        throw new Error('Duplicate entry');
      }
      throw error;
    }
  }

  static async findByEmail(email) {
    if (!email) return null;
    const [rows] = await pool.execute(
      'SELECT * FROM admin_users WHERE email = ? AND is_active = TRUE LIMIT 1',
      [String(email).trim().toLowerCase()]
    );
    return rows[0] || null;
  }

  static async findByUsername(username) {
    if (!username) return null;
    const [rows] = await pool.execute(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = TRUE LIMIT 1',
      [String(username).trim()]
    );
    return rows[0] || null;
  }

  static async findById(adminUserID) {
    if (!adminUserID) return null;
    const [rows] = await pool.execute(
      `SELECT adminUserID, username, email, full_name, role, last_login, created_at
       FROM admin_users
       WHERE adminUserID = ? AND is_active = TRUE
       LIMIT 1`,
      [adminUserID]
    );
    return rows[0] || null;
  }

  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT adminUserID, username, email, full_name, role, last_login, created_at
       FROM admin_users
       WHERE is_active = TRUE
       ORDER BY created_at DESC`
    );
    return rows;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    if (!plainPassword || !hashedPassword) return false;
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(adminUserID) {
    if (!adminUserID) return false;
    await pool.execute(
      'UPDATE admin_users SET last_login = NOW() WHERE adminUserID = ?',
      [adminUserID]
    );
    return true;
  }

  static async updateProfile(adminUserID, { full_name, role } = {}) {
    if (!adminUserID) throw new Error('adminUserID is required');

    const existing = await this.findById(adminUserID);
    if (!existing) throw new Error('Admin user not found');

    if (role !== undefined && role !== null && !ALLOWED_ROLES.includes(role)) {
      throw new Error(`Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`);
    }

    const cleanName = full_name !== undefined ? String(full_name).trim() : null;
    if (
      cleanName !== null &&
      (cleanName.length < VALIDATION.fullName.min || cleanName.length > VALIDATION.fullName.max)
    ) {
      throw new Error(`Full name must be ${VALIDATION.fullName.min}–${VALIDATION.fullName.max} characters`);
    }

    await pool.execute(
      `UPDATE admin_users
       SET full_name = COALESCE(?, full_name),
           role      = COALESCE(?, role)
       WHERE adminUserID = ? AND is_active = TRUE`,
      [cleanName || null, role || null, adminUserID]
    );

    return this.findById(adminUserID);
  }

  static async changePassword(adminUserID, { current_password, new_password } = {}) {
    if (!adminUserID) throw new Error('adminUserID is required');
    if (!current_password || !new_password) {
      throw new Error('Both current_password and new_password are required');
    }

    if (
      new_password.length < VALIDATION.password.min ||
      new_password.length > VALIDATION.password.max
    ) {
      throw new Error(`New password must be ${VALIDATION.password.min}–${VALIDATION.password.max} characters`);
    }

    if (current_password === new_password) {
      throw new Error('New password must differ from the current password');
    }

    const [rows] = await pool.execute(
      'SELECT adminUserID, password_hash FROM admin_users WHERE adminUserID = ? AND is_active = TRUE LIMIT 1',
      [adminUserID]
    );
    const admin = rows[0];
    if (!admin) throw new Error('Admin user not found');

    const isMatch = await bcrypt.compare(current_password, admin.password_hash);
    if (!isMatch) throw new Error('Current password is incorrect');

    const new_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.execute(
      'UPDATE admin_users SET password_hash = ? WHERE adminUserID = ?',
      [new_hash, adminUserID]
    );

    return true;
  }

  
  static async delete(adminUserID) {
    if (!adminUserID) throw new Error('adminUserID is required');

    const target = await this.findById(adminUserID);
    if (!target) throw new Error('Admin user not found');

    // Prevent deleting the last super_admin
    if (target.role === 'super_admin') {
      const [rows] = await pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM admin_users
         WHERE role = 'super_admin' AND is_active = TRUE`
      );
      const superAdminCount = rows[0]?.cnt ?? 0;
      if (superAdminCount <= 1) {
        throw new Error('Cannot delete the last super_admin. Promote another admin first.');
      }
    }

    const [result] = await pool.execute(
      'DELETE FROM admin_users WHERE adminUserID = ?',
      [adminUserID]
    );

    if (result.affectedRows === 0) {
      throw new Error('Admin user not found');
    }

    return true;
  }

  // Legacy alias – keep for compatibility, but use delete for hard removal
  static async deactivate(adminUserID) {
    return this.delete(adminUserID);
  }
}

module.exports = AdminUser;