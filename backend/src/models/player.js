// backend/src/models/Player.js
const db = require('../config/database');

class Player {
  static _toInt(value, fallback = 0) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  static _toString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  // Get all active players
  static async getAll() {
    const [rows] = await db.query(
      'SELECT * FROM players WHERE is_active = TRUE ORDER BY jersey_number ASC'
    );
    return rows;
  }

  // Get player by ID (active only)
  static async getById(id) {
    const playerId = this._toInt(id, null);
    if (!playerId) return null;

    const [rows] = await db.query(
      'SELECT * FROM players WHERE id = ? AND is_active = TRUE',
      [playerId]
    );
    return rows[0] || null;
  }

  // Create new player
  static async create(playerData) {
    try {
      const name = this._toString(playerData?.name);
      const jersey_number = this._toInt(playerData?.jersey_number, null);
      const position = this._toString(playerData?.position);
      const age = this._toInt(playerData?.age, null);

      if (!name || !jersey_number || !position || !age) {
        throw new Error('All fields are required');
      }

      const [result] = await db.query(
        `INSERT INTO players (name, jersey_number, position, age)
         VALUES (?, ?, ?, ?)`,
        [name, jersey_number, position, age]
      );

      return {
        id: result.insertId,
        name,
        jersey_number,
        position,
        age,
        goals: 0,
        assists: 0,
        appearances: 0,
        yellow_cards: 0,
        red_cards: 0,
      };
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new Error('Jersey number already in use');
      }
      throw error;
    }
  }

  // Update player stats (active only)
  static async updateStats(id, stats) {
    const playerId = this._toInt(id, null);
    if (!playerId) throw new Error('Player not found');

    const goals = this._toInt(stats?.goals, 0);
    const assists = this._toInt(stats?.assists, 0);
    const appearances = this._toInt(stats?.appearances, 0);
    const yellow_cards = this._toInt(stats?.yellow_cards, 0);
    const red_cards = this._toInt(stats?.red_cards, 0);

    const [result] = await db.query(
      `UPDATE players
       SET goals = ?, assists = ?, appearances = ?, yellow_cards = ?, red_cards = ?
       WHERE id = ? AND is_active = TRUE`,
      [goals, assists, appearances, yellow_cards, red_cards, playerId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Player not found');
    }

    return this.getById(playerId);
  }

  // Update player basic info (active only)
  static async update(id, playerData) {
    try {
      const playerId = this._toInt(id, null);
      if (!playerId) throw new Error('Player not found');

      const name = this._toString(playerData?.name);
      const jersey_number = this._toInt(playerData?.jersey_number, null);
      const position = this._toString(playerData?.position);
      const age = this._toInt(playerData?.age, null);

      if (!name || !jersey_number || !position || !age) {
        throw new Error('All fields are required');
      }

      const [result] = await db.query(
        `UPDATE players
         SET name = ?, jersey_number = ?, position = ?, age = ?
         WHERE id = ? AND is_active = TRUE`,
        [name, jersey_number, position, age, playerId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Player not found');
      }

      return this.getById(playerId);
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new Error('Jersey number already in use');
      }
      throw error;
    }
  }

  // Soft delete player
  static async delete(id) {
    const playerId = this._toInt(id, null);
    if (!playerId) throw new Error('Player not found');

    const [result] = await db.query(
      'UPDATE players SET is_active = FALSE WHERE id = ? AND is_active = TRUE',
      [playerId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Player not found');
    }

    return { success: true, message: 'Player removed successfully' };
  }

  // Get top scorers (active only)
  static async getTopScorers(limit = 5) {
    // Force safe integer + cap
    const safeLimit = Math.min(Math.max(this._toInt(limit, 5), 1), 50);

    // Using a literal LIMIT avoids certain edge cases with prepared LIMIT on some setups
    const [rows] = await db.query(
      `SELECT * FROM players
       WHERE is_active = TRUE
       ORDER BY goals DESC, assists DESC, appearances DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }

  // Get players by position (active only)
  static async getByPosition(position) {
    const pos = this._toString(position);
    if (!pos) return [];

    const [rows] = await db.query(
      `SELECT * FROM players
       WHERE position = ? AND is_active = TRUE
       ORDER BY jersey_number ASC`,
      [pos]
    );
    return rows;
  }
}

module.exports = Player;
