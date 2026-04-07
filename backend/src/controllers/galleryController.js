// backend/src/controllers/galleryController.js
const db = require('../config/database');
const path = require('path');
const Gallery = require('../models/Gallery');
const { parsePagination, sendPaginated } = require('../utils/pagination');

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const sendSuccess = (res, status, data, message) =>
  res.status(status).json({ success: true, message, data });

const toInt = (v) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? n : null; };
const safeTrim = (v) => (typeof v === 'string' ? v.trim() : v);

/**
 * GET /api/gallery
 * Returns all gallery items ordered by upload date descending.
 * Supports pagination via ?page=1&limit=20 query params.
 */
exports.getAll = async (req, res) => {
  try {
    // Check if pagination is requested
    const usePagination = req.query.page || req.query.limit;

    if (usePagination) {
      const { page, limit, offset } = parsePagination(req.query, { maxLimit: 100 });
      const [items, totalCount] = await Promise.all([
        Gallery.getAllPaginated(offset, limit),
        Gallery.getCount(),
      ]);
      return sendPaginated(res, 200, items, totalCount, page, limit);
    }

    // Fallback: return all (backward compatibility)
    const [rows] = await db.query(
      `SELECT g.*, a.full_name as admin_name
       FROM gallery g
       JOIN admin_users a ON g.adminUserID = a.adminUserID
       ORDER BY g.upload_date DESC, g.galleryID DESC`
    );
    return sendSuccess(res, 200, rows);
  } catch (error) {
    console.error('Get gallery error:', error);
    return sendError(res, 500, 'Failed to fetch gallery');
  }
};

/**
 * GET /api/gallery/:id
 * Returns a single gallery item by ID.
 */
exports.getById = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 400, 'Invalid gallery id');

    const [rows] = await db.query(
      `SELECT g.*, a.full_name as admin_name
       FROM gallery g
       JOIN admin_users a ON g.adminUserID = a.adminUserID
       WHERE g.galleryID = ?`,
      [id]
    );
    if (!rows.length) return sendError(res, 404, 'Gallery item not found');
    return sendSuccess(res, 200, rows[0]);
  } catch (error) {
    console.error('Get gallery by id error:', error);
    return sendError(res, 500, 'Failed to fetch gallery item');
  }
};

/**
 * GET /api/gallery/match/:matchID
 * Returns gallery items for a specific match.
 */
exports.getByMatch = async (req, res) => {
  try {
    const matchID = toInt(req.params.matchID);
    if (!matchID) return sendError(res, 400, 'Invalid match id');

    const [rows] = await db.query(
      `SELECT g.*, a.full_name as admin_name
       FROM gallery g
       JOIN admin_users a ON g.adminUserID = a.adminUserID
       WHERE g.matchID = ?
       ORDER BY g.upload_date DESC`,
      [matchID]
    );
    return sendSuccess(res, 200, rows);
  } catch (error) {
    console.error('Get gallery by match error:', error);
    return sendError(res, 500, 'Failed to fetch gallery items');
  }
};

// ================== ADMIN ENDPOINTS ==================

/**
 * POST /api/admin/gallery/upload
 * Uploads an image file and creates a gallery entry.
 * Uses multer middleware for file handling.
 */
exports.uploadImage = async (req, res) => {
  try {
    const adminUserID = req.user.id;
    const title = safeTrim(req.body?.title) || 'Gallery Photo';
    const description = safeTrim(req.body?.description) || null;
    const matchID = req.body?.matchID ? toInt(req.body.matchID) : null;

    if (!req.file) return sendError(res, 400, 'No image file provided');

    // Build the URL path to the uploaded file
    const image_url = `/uploads/gallery/${req.file.filename}`;
    const upload_date = new Date().toISOString().slice(0, 10);

    const [result] = await db.query(
      `INSERT INTO gallery (adminUserID, title, description, image_url, upload_date, matchID)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminUserID, title, description, image_url, upload_date, matchID]
    );

    return sendSuccess(res, 201, {
      galleryID: result.insertId,
      title,
      description,
      image_url,
      upload_date,
      matchID,
      filename: req.file.filename,
      size: req.file.size,
    }, 'Image uploaded successfully');
  } catch (error) {
    console.error('Upload gallery image error:', error);
    return sendError(res, 500, 'Failed to upload image');
  }
};

/**
 * POST /api/admin/gallery
 * Creates a new gallery entry (without file upload — uses image_url from body).
 */
exports.create = async (req, res) => {
  try {
    const adminUserID = req.user.id;
    const title = safeTrim(req.body?.title);
    const description = safeTrim(req.body?.description) || null;
    const image_url = safeTrim(req.body?.image_url) || null;
    const matchID = req.body?.matchID ? toInt(req.body.matchID) : null;

    if (!title) return sendError(res, 400, 'Title is required');

    const upload_date = new Date().toISOString().slice(0, 10);

    const [result] = await db.query(
      `INSERT INTO gallery (adminUserID, title, description, image_url, upload_date, matchID)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminUserID, title, description, image_url, upload_date, matchID]
    );

    return sendSuccess(res, 201, {
      galleryID: result.insertId,
      adminUserID,
      title,
      description,
      image_url,
      upload_date,
      matchID,
    }, 'Gallery item added');
  } catch (error) {
    console.error('Create gallery error:', error);
    return sendError(res, 500, 'Failed to add gallery item');
  }
};

/**
 * DELETE /api/admin/gallery/:id
 * Removes a gallery entry.
 */
exports.deleteGallery = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 400, 'Invalid gallery id');

    const [result] = await db.query('DELETE FROM gallery WHERE galleryID = ?', [id]);
    if (result.affectedRows === 0) return sendError(res, 404, 'Gallery item not found');

    return sendSuccess(res, 200, null, 'Gallery item deleted');
  } catch (error) {
    console.error('Delete gallery error:', error);
    return sendError(res, 500, 'Failed to delete gallery item');
  }
};
