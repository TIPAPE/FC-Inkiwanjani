// backend/src/models/PasswordReset.js
const pool = require('../config/database');
const crypto = require('crypto');

const TOKEN_EXPIRY_MINUTES = 30;

class PasswordReset {
  /**
   * Generate a secure random token
   */
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a password reset token for a user or admin
   */
  static async createToken(email, isAdmin = false) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    const idColumn = isAdmin ? 'adminUserID' : 'userID';
    const table = isAdmin ? 'admin_users' : 'users';

    // Find the user/admin by email
    const [rows] = await pool.execute(
      `SELECT ${idColumn} FROM ${table} WHERE email = ? AND is_active = TRUE LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return null; // User not found
    }

    const userId = rows[0][idColumn];

    // Invalidate any existing unused tokens for this user
    await pool.execute(
      `UPDATE password_reset_tokens SET used = 1 WHERE ${idColumn} = ? AND used = 0`,
      [userId]
    );

    // Insert new token
    await pool.execute(
      `INSERT INTO password_reset_tokens (${isAdmin ? 'adminUserID' : 'userID'}, email, token, expires_at)
       VALUES (?, ?, ?, ?)`,
      [userId, email, token, expiresAt]
    );

    return { token, expiresAt, email };
  }

  /**
   * Validate a reset token and return the associated user info
   */
  static async validateToken(token) {
    const [rows] = await pool.execute(
      `SELECT * FROM password_reset_tokens
       WHERE token = ? AND used = 0 AND expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return null;
    }

    const resetRecord = rows[0];

    // Determine if this is a user or admin
    let userId, isAdmin, table;
    if (resetRecord.userID) {
      userId = resetRecord.userID;
      isAdmin = false;
      table = 'users';
    } else if (resetRecord.adminUserID) {
      userId = resetRecord.adminUserID;
      isAdmin = true;
      table = 'admin_users';
    } else {
      return null;
    }

    const idColumn = isAdmin ? 'adminUserID' : 'userID';

    // Get user info
    const [userRows] = await pool.execute(
      `SELECT ${idColumn}, email, full_name, username FROM ${table} WHERE ${idColumn} = ? AND is_active = TRUE LIMIT 1`,
      [userId]
    );

    if (userRows.length === 0) {
      return null;
    }

    return {
      ...userRows[0],
      isAdmin,
      tokenID: resetRecord.tokenID,
    };
  }

  /**
   * Reset password using a valid token
   */
  static async resetPassword(token, newPassword) {
    const userInfo = await this.validateToken(token);
    if (!userInfo) {
      return { success: false, message: 'Invalid or expired token' };
    }

    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(newPassword, 10);

    const table = userInfo.isAdmin ? 'admin_users' : 'users';
    const idColumn = userInfo.isAdmin ? 'adminUserID' : 'userID';
    const idValue = userInfo.isAdmin ? userInfo.adminUserID : userInfo.userID;

    // Update password
    await pool.execute(
      `UPDATE ${table} SET password_hash = ? WHERE ${idColumn} = ?`,
      [password_hash, idValue]
    );

    // Mark token as used
    await pool.execute(
      'UPDATE password_reset_tokens SET used = 1 WHERE tokenID = ?',
      [userInfo.tokenID]
    );

    return { success: true, message: 'Password reset successfully' };
  }

  /**
   * Clean up expired tokens (call periodically)
   */
  static async cleanupExpiredTokens() {
    await pool.execute(
      'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = 1'
    );
  }
}

module.exports = PasswordReset;
