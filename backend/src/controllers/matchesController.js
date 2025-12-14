// src/controllers/matchesController.js
const { query } = require('../config/database');

exports.getMatches = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, opponent, match_date, venue, competition, status, home_score, away_score, summary
       FROM matches
       ORDER BY match_date DESC
       LIMIT 50`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getMatches error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getNextMatch = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, opponent, match_date, venue, competition, status
       FROM matches
       WHERE status IN ('upcoming','live') AND match_date >= NOW()
       ORDER BY match_date ASC
       LIMIT 1`
    );
    if (!rows.length) return res.json({ success: true, data: null });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getNextMatch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLastMatch = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, opponent, match_date, venue, competition, status, home_score, away_score
       FROM matches
       WHERE status = 'completed' AND match_date <= NOW()
       ORDER BY match_date DESC
       LIMIT 1`
    );
    if (!rows.length) return res.json({ success: true, data: null });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getLastMatch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getMatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(
      `SELECT * FROM matches WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Match not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getMatchById error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
