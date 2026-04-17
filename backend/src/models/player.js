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

  static async getAll() {
    const [rows] = await db.query(
      'SELECT * FROM players ORDER BY jersey_number ASC'
    );
    return rows;
  }

  static async getAllPaginated(offset, limit) {
    const [rows] = await db.query(
      'SELECT * FROM players ORDER BY jersey_number ASC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows;
  }

  static async getCount() {
    const [rows] = await db.query('SELECT COUNT(*) as total FROM players');
    return rows[0]?.total || 0;
  }

  static async getById(playerID) {
    const id = this._toInt(playerID, null);
    if (!id) return null;
    const [rows] = await db.query('SELECT * FROM players WHERE playerID = ?', [id]);
    return rows[0] || null;
  }

  static async create(playerData) {
    try {
      const name = this._toString(playerData?.name);
      const jersey_number = this._toInt(playerData?.jersey_number, null);
      const position = this._toString(playerData?.position);
      const age = this._toInt(playerData?.age, null);
      const matchID = playerData?.matchID ? this._toInt(playerData.matchID, null) : null;

      if (!name || !jersey_number || !position || !age) {
        throw new Error('All fields are required');
      }

      const [result] = await db.query(
        `INSERT INTO players (name, jersey_number, position, age, matchID)
         VALUES (?, ?, ?, ?, ?)`,
        [name, jersey_number, position, age, matchID]
      );

      return {
        playerID: result.insertId,
        name,
        jersey_number,
        position,
        age,
        matchID,
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

  static async updateStats(playerID, stats) {
    const id = this._toInt(playerID, null);
    if (!id) throw new Error('Player not found');

    const goals = this._toInt(stats?.goals, 0);
    const assists = this._toInt(stats?.assists, 0);
    const appearances = this._toInt(stats?.appearances, 0);
    const yellow_cards = this._toInt(stats?.yellow_cards, 0);
    const red_cards = this._toInt(stats?.red_cards, 0);

    const [result] = await db.query(
      `UPDATE players
       SET goals = ?, assists = ?, appearances = ?, yellow_cards = ?, red_cards = ?
       WHERE playerID = ?`,
      [goals, assists, appearances, yellow_cards, red_cards, id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Player not found');
    }

    return this.getById(id);
  }

  static async update(playerID, playerData) {
    try {
      const id = this._toInt(playerID, null);
      if (!id) throw new Error('Player not found');

      const name = this._toString(playerData?.name);
      const jersey_number = this._toInt(playerData?.jersey_number, null);
      const position = this._toString(playerData?.position);
      const age = this._toInt(playerData?.age, null);
      const matchID = playerData?.matchID !== undefined ? this._toInt(playerData.matchID, null) : undefined;

      if (!name || !jersey_number || !position || !age) {
        throw new Error('All fields are required');
      }

      let query, params;
      if (matchID !== undefined) {
        query = `UPDATE players
                 SET name = ?, jersey_number = ?, position = ?, age = ?, matchID = ?
                 WHERE playerID = ?`;
        params = [name, jersey_number, position, age, matchID, id];
      } else {
        query = `UPDATE players
                 SET name = ?, jersey_number = ?, position = ?, age = ?
                 WHERE playerID = ?`;
        params = [name, jersey_number, position, age, id];
      }

      const [result] = await db.query(query, params);

      if (result.affectedRows === 0) {
        throw new Error('Player not found');
      }

      return this.getById(id);
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new Error('Jersey number already in use');
      }
      throw error;
    }
  }

  // ✅ HARD DELETE – permanently remove player from database
  static async delete(playerID) {
    const id = this._toInt(playerID, null);
    if (!id) throw new Error('Player not found');

    const [result] = await db.query('DELETE FROM players WHERE playerID = ?', [id]);

    if (result.affectedRows === 0) {
      throw new Error('Player not found');
    }

    return { success: true, message: 'Player permanently deleted' };
  }

  static async getTopScorers(limit = 5) {
    const safeLimit = Math.min(Math.max(this._toInt(limit, 5), 1), 50);
    const [rows] = await db.query(
      `SELECT * FROM players
       ORDER BY goals DESC, assists DESC, appearances DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }

  static async getByPosition(position) {
    const pos = this._toString(position);
    if (!pos) return [];
    const [rows] = await db.query(
      `SELECT * FROM players
       WHERE position = ?
       ORDER BY jersey_number ASC`,
      [pos]
    );
    return rows;
  }

  static async getByMatch(matchID) {
    const id = this._toInt(matchID, null);
    if (!id) return [];
    const [rows] = await db.query(
      `SELECT * FROM players
       WHERE matchID = ?
       ORDER BY jersey_number ASC`,
      [id]
    );
    return rows;
  }
}

module.exports = Player;