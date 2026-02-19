// backend/src/models/Match.js
const db = require('../config/database');

class Match {
  static _toInt(value, fallback = 0) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  static _toString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  static _isValidEnum(value, allowed) {
    return allowed.includes(value);
  }

  static _normalizeDateTime(value) {
    // Accepts:
    // - 'YYYY-MM-DD HH:MM:SS'
    // - ISO strings -> will be passed through as-is (MySQL can parse many ISO formats)
    // We just ensure it's a non-empty string.
    const v = this._toString(value);
    return v.length ? v : null;
  }

  // Get all matches
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM matches ORDER BY match_date DESC');
    return rows;
  }

  // Get match by ID
  static async getById(id) {
    const matchId = this._toInt(id, null);
    if (!matchId) return null;

    const [rows] = await db.query('SELECT * FROM matches WHERE id = ?', [matchId]);
    return rows[0] || null;
  }

  // Get upcoming matches (status = upcoming, in the future)
  static async getUpcoming() {
    const [rows] = await db.query(
      `SELECT * FROM matches
       WHERE status = 'upcoming' AND match_date >= NOW()
       ORDER BY match_date ASC`
    );
    return rows;
  }

  // Get next match
  static async getNext() {
    const [rows] = await db.query(
      `SELECT * FROM matches
       WHERE status = 'upcoming' AND match_date >= NOW()
       ORDER BY match_date ASC
       LIMIT 1`
    );
    return rows[0] || null;
  }

  // Get last completed match
  static async getLastCompleted() {
    const [rows] = await db.query(
      `SELECT * FROM matches
       WHERE status = 'completed'
       ORDER BY match_date DESC
       LIMIT 1`
    );
    return rows[0] || null;
  }

  // Get completed matches
  static async getCompleted(limit = 10) {
    const safeLimit = Math.min(Math.max(this._toInt(limit, 10), 1), 100);

    // Use literal LIMIT to avoid edge cases on some MySQL configs with prepared LIMIT params
    const [rows] = await db.query(
      `SELECT * FROM matches
       WHERE status = 'completed'
       ORDER BY match_date DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }

  // Create new match
  static async create(matchData) {
    const opponent = this._toString(matchData?.opponent);
    const match_date = this._normalizeDateTime(matchData?.match_date);
    const venue = this._toString(matchData?.venue);
    const competition = this._toString(matchData?.competition);

    const allowedVenues = ['home', 'away'];
    const allowedCompetitions = ['league', 'cup', 'friendly'];

    if (!opponent || !match_date || !venue || !competition) {
      throw new Error('All fields are required');
    }

    if (!this._isValidEnum(venue, allowedVenues)) {
      throw new Error(`Invalid venue. Allowed: ${allowedVenues.join(', ')}`);
    }

    if (!this._isValidEnum(competition, allowedCompetitions)) {
      throw new Error(`Invalid competition. Allowed: ${allowedCompetitions.join(', ')}`);
    }

    const [result] = await db.query(
      `INSERT INTO matches (opponent, match_date, venue, competition, status)
       VALUES (?, ?, ?, ?, 'upcoming')`,
      [opponent, match_date, venue, competition]
    );

    return {
      id: result.insertId,
      opponent,
      match_date,
      venue,
      competition,
      status: 'upcoming',
      home_score: null,
      away_score: null,
      summary: null,
      attendance: null,
    };
  }

  // Update match result (marks match completed)
  static async updateResult(id, resultData) {
    const matchId = this._toInt(id, null);
    if (!matchId) throw new Error('Match not found');

    // Scores are required for a completed match
    const home_score =
      resultData?.home_score === null || resultData?.home_score === undefined
        ? null
        : this._toInt(resultData.home_score, null);

    const away_score =
      resultData?.away_score === null || resultData?.away_score === undefined
        ? null
        : this._toInt(resultData.away_score, null);

    if (home_score === null || away_score === null) {
      throw new Error('Home and away scores are required');
    }

    const summary = this._toString(resultData?.summary) || null;
    const attendanceRaw = resultData?.attendance;
    const attendance =
      attendanceRaw === null || attendanceRaw === undefined || attendanceRaw === ''
        ? null
        : this._toInt(attendanceRaw, null);

    const [result] = await db.query(
      `UPDATE matches
       SET status = 'completed',
           home_score = ?,
           away_score = ?,
           summary = ?,
           attendance = ?
       WHERE id = ?`,
      [home_score, away_score, summary, attendance, matchId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Match not found');
    }

    return this.getById(matchId);
  }

  // Update match details (does not change status automatically)
  static async update(id, matchData) {
    const matchId = this._toInt(id, null);
    if (!matchId) throw new Error('Match not found');

    const opponent = this._toString(matchData?.opponent);
    const match_date = this._normalizeDateTime(matchData?.match_date);
    const venue = this._toString(matchData?.venue);
    const competition = this._toString(matchData?.competition);

    const allowedVenues = ['home', 'away'];
    const allowedCompetitions = ['league', 'cup', 'friendly'];

    if (!opponent || !match_date || !venue || !competition) {
      throw new Error('All fields are required');
    }

    if (!this._isValidEnum(venue, allowedVenues)) {
      throw new Error(`Invalid venue. Allowed: ${allowedVenues.join(', ')}`);
    }

    if (!this._isValidEnum(competition, allowedCompetitions)) {
      throw new Error(`Invalid competition. Allowed: ${allowedCompetitions.join(', ')}`);
    }

    const [result] = await db.query(
      `UPDATE matches
       SET opponent = ?, match_date = ?, venue = ?, competition = ?
       WHERE id = ?`,
      [opponent, match_date, venue, competition, matchId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Match not found');
    }

    return this.getById(matchId);
  }

  // Delete match (hard delete; bookings cascade per schema)
  static async delete(id) {
    const matchId = this._toInt(id, null);
    if (!matchId) throw new Error('Match not found');

    const [result] = await db.query('DELETE FROM matches WHERE id = ?', [matchId]);

    if (result.affectedRows === 0) {
      throw new Error('Match not found');
    }

    return { success: true, message: 'Match deleted successfully' };
  }

  // Get matches by status
  static async getByStatus(status) {
    const s = this._toString(status);
    const allowedStatuses = ['upcoming', 'live', 'completed', 'cancelled'];

    if (!this._isValidEnum(s, allowedStatuses)) {
      throw new Error(`Invalid status. Allowed: ${allowedStatuses.join(', ')}`);
    }

    const [rows] = await db.query(
      'SELECT * FROM matches WHERE status = ? ORDER BY match_date DESC',
      [s]
    );
    return rows;
  }

  // Get matches by competition
  static async getByCompetition(competition) {
    const c = this._toString(competition);
    const allowedCompetitions = ['league', 'cup', 'friendly'];

    if (!this._isValidEnum(c, allowedCompetitions)) {
      throw new Error(`Invalid competition. Allowed: ${allowedCompetitions.join(', ')}`);
    }

    const [rows] = await db.query(
      'SELECT * FROM matches WHERE competition = ? ORDER BY match_date DESC',
      [c]
    );
    return rows;
  }
}

module.exports = Match;
