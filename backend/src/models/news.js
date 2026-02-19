// backend/src/models/News.js
const db = require('../config/database');

class News {
  // ---------- helpers ----------
  static _toString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
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

  // ---------- reads ----------
  static async getAll() {
    const [rows] = await db.query(
      `SELECT *
       FROM news
       WHERE is_published = TRUE
       ORDER BY published_date DESC, created_at DESC`
    );
    return rows;
  }

  static async getLatest(limit = 5) {
    const n = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(n) && n > 0 ? Math.min(n, 50) : 5;

    const [rows] = await db.query(
      `SELECT *
       FROM news
       WHERE is_published = TRUE
       ORDER BY published_date DESC, created_at DESC
       LIMIT ?`,
      [safeLimit]
    );
    return rows;
  }

  static async getByCategory(category) {
    const c = this._validateCategory(category);

    const [rows] = await db.query(
      `SELECT *
       FROM news
       WHERE category = ? AND is_published = TRUE
       ORDER BY published_date DESC, created_at DESC`,
      [c]
    );
    return rows;
  }

  static async getById(id, { incrementViews = true } = {}) {
    const newsId = this._validateId(id);

    // single query fetch
    const [rows] = await db.query('SELECT * FROM news WHERE id = ?', [newsId]);
    const article = rows[0] || null;

    // Only increment views for published articles (public consumption)
    if (article && incrementViews && article.is_published) {
      // Atomic increment
      await db.query('UPDATE news SET views = views + 1 WHERE id = ?', [newsId]);
      article.views = Number(article.views || 0) + 1;
    }

    return article;
  }

  // ---------- writes ----------
  static async create(newsData) {
    const title = this._toString(newsData?.title);
    const content = this._toString(newsData?.content);

    if (!title) throw new Error('Title is required');
    if (!content) throw new Error('Content is required');

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
      `INSERT INTO news (title, category, excerpt, content, author, published_date, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, category, excerpt, content, author, published_date, is_published]
    );

    return {
      id: result.insertId,
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

  static async update(id, newsData) {
    const newsId = this._validateId(id);

    // Get existing so partial updates are safe
    const [existingRows] = await db.query('SELECT * FROM news WHERE id = ?', [newsId]);
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
       WHERE id = ?`,
      [title, category, excerpt, content, author, published_date, is_published, newsId]
    );

    if (result.affectedRows === 0) {
      throw new Error('News article not found');
    }

    // IMPORTANT: do NOT increment views on update fetch
    return this.getById(newsId, { incrementViews: false });
  }

  static async delete(id) {
    const newsId = this._validateId(id);

    const [result] = await db.query('DELETE FROM news WHERE id = ?', [newsId]);

    if (result.affectedRows === 0) {
      throw new Error('News article not found');
    }

    return { success: true, message: 'News article deleted successfully' };
  }

  static async togglePublish(id) {
    const newsId = this._validateId(id);

    const [result] = await db.query(
      'UPDATE news SET is_published = NOT is_published WHERE id = ?',
      [newsId]
    );

    if (result.affectedRows === 0) {
      throw new Error('News article not found');
    }

    return this.getById(newsId, { incrementViews: false });
  }

  // ---------- search ----------
  static async search(query) {
    const q = this._toString(query);
    if (!q) return [];

    const safe = this._sanitizeLikeQuery(q);

    // ESCAPE clause works with mysql2; escaping %, _ and \ above prevents wildcard injection
    const like = `%${safe}%`;

    const [rows] = await db.query(
      `SELECT *
       FROM news
       WHERE is_published = TRUE
         AND (title LIKE ? ESCAPE '\\\\' OR content LIKE ? ESCAPE '\\\\')
       ORDER BY published_date DESC, created_at DESC`,
      [like, like]
    );

    return rows;
  }
}

module.exports = News;
