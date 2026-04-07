// backend/src/models/Gallery.js
const db = require('../config/database');

class Gallery {
  static _toInt(value, fallback = null) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  static _toString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  // Get all gallery items
  static async getAll() {
    const [rows] = await db.query(
      `SELECT g.*, a.full_name as admin_name
       FROM gallery g
       JOIN admin_users a ON g.adminUserID = a.adminUserID
       ORDER BY g.upload_date DESC, g.galleryID DESC`
    );
    return rows;
  }

  // Get paginated gallery items
  static async getAllPaginated(offset, limit) {
    const [rows] = await db.query(
      `SELECT g.*, a.full_name as admin_name
       FROM gallery g
       JOIN admin_users a ON g.adminUserID = a.adminUserID
       ORDER BY g.upload_date DESC, g.galleryID DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  }

  // Get total count of gallery items
  static async getCount() {
    const [rows] = await db.query('SELECT COUNT(*) as total FROM gallery');
    return rows[0]?.total || 0;
  }

  // Get gallery item by ID
  static async getById(galleryID) {
    const id = this._toInt(galleryID);
    if (!id) return null;

    const [rows] = await db.query(
      `SELECT g.*, a.full_name as admin_name
       FROM gallery g
       JOIN admin_users a ON g.adminUserID = a.adminUserID
       WHERE g.galleryID = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // Get gallery items by match
  static async getByMatch(matchID) {
    const mId = this._toInt(matchID);
    if (!mId) return [];

    const [rows] = await db.query(
      `SELECT g.*, a.full_name as admin_name
       FROM gallery g
       JOIN admin_users a ON g.adminUserID = a.adminUserID
       WHERE g.matchID = ?
       ORDER BY g.upload_date DESC`,
      [mId]
    );
    return rows;
  }

  // Create gallery entry
  static async create({ adminUserID, title, description, image_url, upload_date, matchID }) {
    if (!adminUserID || !title) {
      throw new Error('adminUserID and title are required');
    }

    const date = upload_date || new Date().toISOString().slice(0, 10);

    const [result] = await db.query(
      `INSERT INTO gallery (adminUserID, title, description, image_url, upload_date, matchID)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminUserID, title, description || null, image_url || null, date, matchID || null]
    );

    return {
      galleryID: result.insertId,
      adminUserID,
      title,
      description: description || null,
      image_url: image_url || null,
      upload_date: date,
      matchID: matchID || null,
    };
  }

  // Delete gallery entry
  static async delete(galleryID) {
    const id = this._toInt(galleryID);
    if (!id) throw new Error('Invalid gallery id');

    const [result] = await db.query('DELETE FROM gallery WHERE galleryID = ?', [id]);
    if (result.affectedRows === 0) throw new Error('Gallery item not found');

    return { success: true, message: 'Gallery item deleted' };
  }
}

module.exports = Gallery;
