// src/controllers/newsController.js
const { query } = require('../config/database');

exports.getPublishedNews = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, title, category, excerpt, published_date, author, views
       FROM news
       WHERE is_published = TRUE
       ORDER BY published_date DESC
       LIMIT 20`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getPublishedNews error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(
      `SELECT id, title, category, excerpt, content, published_date, author, views
       FROM news
       WHERE id = ? AND is_published = TRUE
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    // Increment views (fire-and-forget)
    query(`UPDATE news SET views = views + 1 WHERE id = ?`, [id]).catch((e) => {
      console.error('Failed to increment views for news id', id, e);
    });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getNewsById error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
