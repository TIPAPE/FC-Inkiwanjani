// backend/src/models/AdminUser.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// ── Constants ────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 10;
const ALLOWED_ROLES = ['super_admin', 'admin', 'editor'];

// Validation limits (kept in sync with DB schema VARCHAR lengths)
const VALIDATION = {
  username: { min: 3, max: 50, pattern: /^[a-zA-Z0-9_]+$/ },
  email:    { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { min: 8, max: 128 },
  fullName: { min: 2, max: 100 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip password_hash before sending user data to callers that don't need it.
 * findByEmail / findByUsername intentionally return the hash for login; all
 * other public-facing methods should call this first.
 */
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
    throw new Error('Username may only contain letters, numbers and underscores');
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

// ── Model ────────────────────────────────────────────────────────────────────
class AdminUser {

  // ── CREATE ─────────────────────────────────────────────────────────────────

  /**
   * Create a new admin user.
   * Validates and sanitizes all inputs before writing to DB.
   * Returns safe user object (no password_hash).
   */
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
        id: result.insertId,
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

  // ── LOOKUPS ────────────────────────────────────────────────────────────────

  /**
   * Find by email — returns full row INCLUDING password_hash.
   * Only use this for login verification. Never send result directly to client.
   */
  static async findByEmail(email) {
    if (!email) return null;
    const [rows] = await pool.execute(
      'SELECT * FROM admin_users WHERE email = ? AND is_active = TRUE LIMIT 1',
      [String(email).trim().toLowerCase()]
    );
    return rows[0] || null;
  }

  /**
   * Find by username — returns full row INCLUDING password_hash.
   * Only use this for login verification. Never send result directly to client.
   */
  static async findByUsername(username) {
    if (!username) return null;
    const [rows] = await pool.execute(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = TRUE LIMIT 1',
      [String(username).trim()]
    );
    return rows[0] || null;
  }

  /**
   * Find by ID — safe fields only (no password_hash).
   * Used by auth middleware after token verification.
   *
   * IMPORTANT: returns null for deactivated admins. Auth middleware MUST
   * treat a null return as 401 Unauthorized, not a 500 error.
   */
  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.execute(
      `SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at
       FROM admin_users
       WHERE id = ? AND is_active = TRUE
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find ALL active admins — safe fields only.
   * Intended for super_admin / admin use only; guard at route level.
   */
  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT id, username, email, full_name, role, last_login, created_at, updated_at
       FROM admin_users
       WHERE is_active = TRUE
       ORDER BY created_at DESC`
    );
    return rows;
  }

  // ── AUTH ───────────────────────────────────────────────────────────────────

  /** Compare a plain-text password against a stored bcrypt hash. */
  static async verifyPassword(plainPassword, hashedPassword) {
    if (!plainPassword || !hashedPassword) return false;
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /** Stamp last_login = NOW(). Called immediately after successful login. */
  static async updateLastLogin(id) {
    if (!id) return false;
    await pool.execute(
      'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
      [id]
    );
    return true;
  }

  // ── UPDATES ────────────────────────────────────────────────────────────────

  /**
   * Update full_name and/or role for an admin.
   * Throws if an explicitly supplied role value is not in ALLOWED_ROLES,
   * so invalid roles are rejected loudly instead of silently ignored.
   */
  static async updateProfile(id, { full_name, role } = {}) {
    if (!id) throw new Error('Admin id is required');

    const existing = await this.findById(id);
    if (!existing) throw new Error('Admin user not found');

    // Validate role only if explicitly supplied
    if (role !== undefined && role !== null) {
      if (!ALLOWED_ROLES.includes(role)) {
        throw new Error(`Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`);
      }
    }

    const cleanName = full_name !== undefined ? String(full_name).trim() : null;
    if (cleanName !== null && (cleanName.length < VALIDATION.fullName.min || cleanName.length > VALIDATION.fullName.max)) {
      throw new Error(`Full name must be ${VALIDATION.fullName.min}–${VALIDATION.fullName.max} characters`);
    }

    await pool.execute(
      `UPDATE admin_users
       SET full_name  = COALESCE(?, full_name),
           role       = COALESCE(?, role),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND is_active = TRUE`,
      [cleanName || null, role || null, id]
    );

    return this.findById(id);
  }

  /**
   * Change an admin's password.
   * Requires the current password to be provided and verified first.
   * Returns true on success, throws on any failure.
   */
  static async changePassword(id, { current_password, new_password } = {}) {
    if (!id) throw new Error('Admin id is required');
    if (!current_password || !new_password) {
      throw new Error('Both current_password and new_password are required');
    }

    if (new_password.length < VALIDATION.password.min || new_password.length > VALIDATION.password.max) {
      throw new Error(`New password must be ${VALIDATION.password.min}–${VALIDATION.password.max} characters`);
    }

    if (current_password === new_password) {
      throw new Error('New password must be different from the current password');
    }

    // Fetch full row (including hash) directly by ID — bypass findById which strips hash
    const [rows] = await pool.execute(
      'SELECT id, password_hash FROM admin_users WHERE id = ? AND is_active = TRUE LIMIT 1',
      [id]
    );
    const admin = rows[0];
    if (!admin) throw new Error('Admin user not found');

    const isMatch = await bcrypt.compare(current_password, admin.password_hash);
    if (!isMatch) throw new Error('Current password is incorrect');

    const new_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.execute(
      'UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [new_hash, id]
    );

    return true;
  }

  // ── DEACTIVATION ───────────────────────────────────────────────────────────

  /**
   * Soft-delete an admin (sets is_active = FALSE).
   * Guards against deactivating the last active super_admin to prevent lockout.
   */
  static async deactivate(id) {
    if (!id) throw new Error('Admin id is required');

    const target = await this.findById(id);
    if (!target) throw new Error('Admin user not found or already inactive');

    // Lockout guard: never deactivate the last active super_admin
    if (target.role === 'super_admin') {
      const [rows] = await pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM admin_users
         WHERE role = 'super_admin' AND is_active = TRUE`
      );
      const superAdminCount = rows[0]?.cnt ?? 0;
      if (superAdminCount <= 1) {
        throw new Error('Cannot deactivate the last super_admin. Promote another admin first.');
      }
    }

    await pool.execute(
      'UPDATE admin_users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return true;
  }
}

module.exports = AdminUser;