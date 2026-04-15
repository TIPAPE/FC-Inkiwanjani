// backend/src/models/News.js
const db = require('../config/database');

class News {
  // ---------- helpers ----------
  static _toString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  static _toInt(value, fallback = null) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  static _validateId(id) {
    const n = Number.parseInt(id, 10);
    if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid news id');
    return n;
  }

  static _validateCategory(category) {
    const c = this._toString(category);
    const allowed = new Set(['match-report', 'transfer', 'announcement', 'community']);
    if (!allowed.has(c)) {
      throw new Error(`Invalid category. Allowed: ${Array.from(allowed).join(', ')}`);
    }
    return c;
  }

  static _isValidDateString(d) {
    return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  }

  static _normalizeDateInput(date) {
    // news.published_date is DATE
    // Accept YYYY-MM-DD, JS Date, or ISO string (take first 10)
    if (!date) return null;

    if (this._isValidDateString(date)) return date;

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    if (typeof date === 'string' && this._isValidDateString(date.slice(0, 10))) {
      return date.slice(0, 10);
    }

    return null;
  }

  static _makeExcerpt(content, excerpt, maxLen = 200) {
    const c = this._toString(content);
    const e = this._toString(excerpt);

    if (e) return e.length > maxLen ? `${e.slice(0, maxLen).trim()}...` : e;

    if (!c) return '';
    const cleaned = c.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLen) return cleaned;
    return `${cleaned.slice(0, maxLen).trim()}...`;
  }

  static _sanitizeLikeQuery(q) {
    // Escape wildcard characters for LIKE queries
    return q.replace(/[\\%_]/g, (m) => `\\${m}`);
  }

  // Validate admin user exists
  static async _adminExists(adminUserID) {
    const [rows] = await db.query(
      'SELECT adminUserID FROM admin_users WHERE adminUserID = ? AND is_active = TRUE LIMIT 1',
      [adminUserID]
    );
    return !!rows[0];
  }

  // ---------- reads ----------
  static async getAll() {
    const [rows] = await db.query(
      `SELECT n.*, a.full_name as admin_name, a.email as admin_email
       FROM news n
       JOIN admin_users a ON n.adminUserID = a.adminUserID
       WHERE n.is_published = TRUE
       ORDER BY n.published_date DESC, n.created_at DESC`
    );
    return rows;
  }

  // Get paginated news
  static async getAllPaginated(offset, limit) {
    const [rows] = await db.query(
      `SELECT n.*, a.full_name as admin_name, a.email as admin_email
       FROM news n
       JOIN admin_users a ON n.adminUserID = a.adminUserID
       WHERE n.is_published = TRUE
       ORDER BY n.published_date DESC, n.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  }

  // Get total count of published news
  static async getCount() {
    const [rows] = await db.query(
      'SELECT COUNT(*) as total FROM news WHERE is_published = TRUE'
    );
    return rows[0]?.total || 0;
  }

  static async getLatest(limit = 5) {
    const n = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(n) && n > 0 ? Math.min(n, 50) : 5;

    const [rows] = await db.query(
      `SELECT n.*, a.full_name as admin_name, a.email as admin_email
       FROM news n
       JOIN admin_users a ON n.adminUserID = a.adminUserID
       WHERE n.is_published = TRUE
       ORDER BY n.published_date DESC, n.created_at DESC
       LIMIT ?`,
      [safeLimit]
    );
    return rows;
  }

  static async getByCategory(category) {
    const c = this._validateCategory(category);

    const [rows] = await db.query(
      `SELECT n.*, a.full_name as admin_name, a.email as admin_email
       FROM news n
       JOIN admin_users a ON n.adminUserID = a.adminUserID
       WHERE n.category = ? AND n.is_published = TRUE
       ORDER BY n.published_date DESC, n.created_at DESC`,
      [c]
    );
    return rows;
  }

  static async getById(newsID, { incrementViews = true } = {}) {
    const id = this._validateId(newsID);

    const [rows] = await db.query(
      `SELECT n.*, a.full_name as admin_name, a.email as admin_email
       FROM news n
       JOIN admin_users a ON n.adminUserID = a.adminUserID
       WHERE n.newsID = ?`,
      [id]
    );
    const article = rows[0] || null;

    // Only increment views for published articles (public consumption)
    if (article && incrementViews && article.is_published) {
      await db.query('UPDATE news SET views = views + 1 WHERE newsID = ?', [id]);
      article.views = Number(article.views || 0) + 1;
    }

    return article;
  }

  // Get news by admin
  static async getByAdmin(adminUserID) {
    const id = this._toInt(adminUserID);
    if (!id) return [];

    const [rows] = await db.query(
      `SELECT n.*, a.full_name as admin_name
       FROM news n
       JOIN admin_users a ON n.adminUserID = a.adminUserID
       WHERE n.adminUserID = ?
       ORDER BY n.published_date DESC, n.created_at DESC`,
      [id]
    );
    return rows;
  }

  // ---------- writes ----------
  static async create(newsData) {
    const adminUserID = this._toInt(newsData?.adminUserID);
    const title = this._toString(newsData?.title);
    const content = this._toString(newsData?.content);

    if (!adminUserID) throw new Error('adminUserID is required');
    if (!title) throw new Error('Title is required');
    if (!content) throw new Error('Content is required');

    const adminExists = await this._adminExists(adminUserID);
    if (!adminExists) {
      throw new Error('Admin user not found');
    }

    const category = this._validateCategory(newsData?.category || 'announcement');
    const author = this._toString(newsData?.author) || 'FC Inkiwanjani';

    const excerpt = this._makeExcerpt(content, newsData?.excerpt, 200);

    // DATE column -> YYYY-MM-DD
    const published_date =
      this._normalizeDateInput(newsData?.published_date) ||
      this._normalizeDateInput(new Date());

    // is_published defaults TRUE in schema; allow override if provided
    const is_published =
      typeof newsData?.is_published === 'boolean' ? newsData.is_published : true;

    const [result] = await db.query(
      `INSERT INTO news (adminUserID, title, category, excerpt, content, author, published_date, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [adminUserID, title, category, excerpt, content, author, published_date, is_published]
    );

    return {
      newsID: result.insertId,
      adminUserID,
      title,
      category,
      excerpt,
      content,
      author,
      published_date,
      is_published,
      views: 0,
    };
  }

  static async update(newsID, newsData) {
    const id = this._validateId(newsID);

    const [existingRows] = await db.query('SELECT * FROM news WHERE newsID = ?', [id]);
    const existing = existingRows[0];
    if (!existing) throw new Error('News article not found');

    const title = newsData?.title !== undefined ? this._toString(newsData.title) : existing.title;
    const content =
      newsData?.content !== undefined ? this._toString(newsData.content) : existing.content;

    if (!title) throw new Error('Title cannot be empty');
    if (!content) throw new Error('Content cannot be empty');

    const category =
      newsData?.category !== undefined
        ? this._validateCategory(newsData.category)
        : existing.category;

    const author =
      newsData?.author !== undefined ? this._toString(newsData.author) || existing.author : existing.author;

    const excerpt =
      newsData?.excerpt !== undefined
        ? this._makeExcerpt(content, newsData.excerpt, 200)
        : existing.excerpt;

    const published_date =
      newsData?.published_date !== undefined
        ? this._normalizeDateInput(newsData.published_date)
        : this._normalizeDateInput(existing.published_date);

    if (newsData?.published_date !== undefined && !published_date) {
      throw new Error('published_date must be a valid date (YYYY-MM-DD)');
    }

    const is_published =
      newsData?.is_published !== undefined
        ? Boolean(newsData.is_published)
        : Boolean(existing.is_published);

    const [result] = await db.query(
      `UPDATE news
       SET title = ?, category = ?, excerpt = ?, content = ?, author = ?, published_date = ?, is_published = ?
       WHERE newsID = ?`,
      [title, category, excerpt, content, author, published_date, is_published, id]
    );

    if (result.affectedRows === 0) {
      throw new Error('News article not found');
    }

    // Do not increment views on update
    return this.getById(id, { incrementViews: false });
  }

  static async delete(newsID) {
    const id = this._validateId(newsID);

    const [result] = await db.query('DELETE FROM news WHERE newsID = ?', [id]);

    if (result.affectedRows === 0) {
      throw new Error('News article not found');
    }

    return { success: true, message: 'News article deleted successfully' };
  }

  static async togglePublish(newsID) {
    const id = this._validateId(newsID);

    const [result] = await db.query(
      'UPDATE news SET is_published = NOT is_published WHERE newsID = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('News article not found');
    }

    return this.getById(id, { incrementViews: false });
  }

  // ---------- search ----------
  static async search(query) {
    const q = this._toString(query);
    if (!q) return [];

    const safe = this._sanitizeLikeQuery(q);

    // ESCAPE clause works with mysql2; escaping %, _ and \ above prevents wildcard injection
    const like = `%${safe}%`;

    const [rows] = await db.query(
      `SELECT n.*, a.full_name as admin_name
       FROM news n
       JOIN admin_users a ON n.adminUserID = a.adminUserID
       WHERE n.is_published = TRUE
         AND (n.title LIKE ? ESCAPE '\\\\' OR n.content LIKE ? ESCAPE '\\\\')
       ORDER BY n.published_date DESC, n.created_at DESC`,
      [like, like]
    );

    return rows;
  }
}

module.exports = News;