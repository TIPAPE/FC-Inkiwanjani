// backend/src/models/Comment.js
const db = require('../config/database');

class Comment {
  static _toInt(value, fallback = null) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  static _toString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  // Get all approved comments (public)
  static async getApproved(limit = 100) {
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 200);
    const [rows] = await db.query(
      `SELECT * FROM comments
       WHERE is_approved = TRUE
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }

  // Get all comments (admin)
  static async getAll(limit = 200) {
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 200, 1), 500);
    const [rows] = await db.query(
      `SELECT * FROM comments ORDER BY created_at DESC LIMIT ${safeLimit}`
    );
    return rows;
  }

  // Get comment by ID
  static async getById(commentID) {
    const id = this._toInt(commentID);
    if (!id) return null;

    const [rows] = await db.query('SELECT * FROM comments WHERE commentID = ?', [id]);
    return rows[0] || null;
  }

  // Create comment
  static async create({ userID, commenter_name, comment_text, is_approved = true }) {
    if (!commenter_name || !comment_text) {
      throw new Error('commenter_name and comment_text are required');
    }
    if (commenter_name.length < 1 || commenter_name.length > 100) {
      throw new Error('Name must be between 1 and 100 characters');
    }
    if (comment_text.length < 1 || comment_text.length > 2000) {
      throw new Error('Comment must be between 1 and 2000 characters');
    }

    const [result] = await db.query(
      `INSERT INTO comments (userID, commenter_name, comment_text, is_approved)
       VALUES (?, ?, ?, ?)`,
      [userID || null, commenter_name, comment_text, is_approved]
    );

    return {
      commentID: result.insertId,
      userID: userID || null,
      commenter_name,
      comment_text,
      is_approved,
      created_at: new Date().toISOString(),
    };
  }

  // Toggle approval status
  static async toggleApproval(commentID) {
    const id = this._toInt(commentID);
    if (!id) throw new Error('Invalid comment id');

    const [result] = await db.query(
      'UPDATE comments SET is_approved = NOT is_approved WHERE commentID = ?',
      [id]
    );
    if (result.affectedRows === 0) throw new Error('Comment not found');

    return this.getById(id);
  }

  // Delete comment
  static async delete(commentID) {
    const id = this._toInt(commentID);
    if (!id) throw new Error('Invalid comment id');

    const [result] = await db.query('DELETE FROM comments WHERE commentID = ?', [id]);
    if (result.affectedRows === 0) throw new Error('Comment not found');

    return { success: true, message: 'Comment deleted' };
  }
}

module.exports = Comment;
