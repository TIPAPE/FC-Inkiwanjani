// src/controllers/newsController.js
const { query } = require('../config/database');

exports.getPublishedNews = async (req, res) => {
  try {
    const rows = await query(
      `SELECT n.newsID, n.title, n.category, n.excerpt, n.published_date, n.author, n.views,
              a.full_name as admin_name, a.email as admin_email
       FROM news n
       JOIN admin_users a ON n.adminUserID = a.adminUserID
       WHERE n.is_published = TRUE
       ORDER BY n.published_date DESC
       LIMIT 20`  // ✅ CHANGED: id → newsID, added admin join
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getPublishedNews error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;  // ✅ Keep as 'id' in route params
    const rows = await query(
      `SELECT n.newsID, n.title, n.category, n.excerpt, n.content, n.published_date, n.author, n.views,
              a.full_name as admin_name, a.email as admin_email
       FROM news n
       JOIN admin_users a ON n.adminUserID = a.adminUserID
       WHERE n.newsID = ? AND n.is_published = TRUE
       LIMIT 1`,  // ✅ CHANGED: id → newsID, added admin join
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    // Increment views (fire-and-forget)
    query(`UPDATE news SET views = views + 1 WHERE newsID = ?`, [id]).catch((e) => {  // ✅ CHANGED
      console.error('Failed to increment views for news id', id, e);
    });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getNewsById error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};