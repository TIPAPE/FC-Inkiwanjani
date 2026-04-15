// backend/src/models/Settings.js
const db = require('../config/database');

class Settings {
  // ---------- helpers ----------
  static _toString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  static _toInt(value, fallback = 0) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  static _ensureKey(key) {
    const k = this._toString(key);
    if (!k) throw new Error('Setting key is required');
    if (k.length > 100) throw new Error('Setting key is too long');
    return k;
  }

  static _ensureKeys(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return [];
    const cleaned = keys.map((k) => this._ensureKey(k));
    // de-dupe
    return [...new Set(cleaned)];
  }

  // Validate admin user exists
  static async _adminExists(adminUserID) {
    const [rows] = await db.query(
      'SELECT adminUserID FROM admin_users WHERE adminUserID = ? AND is_active = TRUE LIMIT 1',
      [adminUserID]
    );
    return !!rows[0];
  }

  // ---------- core ----------
  static async getAll() {
    const [rows] = await db.query(
      'SELECT setting_key, setting_value FROM settings'
    );

    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  }

  static async getByKey(key) {
    const k = this._ensureKey(key);
    const [rows] = await db.query(
      'SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1',
      [k]
    );
    return rows[0]?.setting_value ?? null;
  }

  static async getByKeys(keys) {
    const ks = this._ensureKeys(keys);
    if (ks.length === 0) return {};

    const placeholders = ks.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT setting_key, setting_value
       FROM settings
       WHERE setting_key IN (${placeholders})`,
      ks
    );

    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  }

  // Set or update a single setting - requires adminUserID
  static async set(key, value, adminUserID) {
    const k = this._ensureKey(key);
    const v = this._toString(value);
    const aID = this._toInt(adminUserID, null);

    if (!aID) {
      throw new Error('adminUserID is required');
    }

    const adminExists = await this._adminExists(aID);
    if (!adminExists) {
      throw new Error('Admin user not found');
    }

    await db.query(
      `INSERT INTO settings (adminUserID, setting_key, setting_value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), adminUserID = VALUES(adminUserID)`,
      [aID, k, v]
    );

    return { key: k, value: v };
  }

  // Update multiple settings atomically - requires adminUserID
  static async setMultiple(settings, adminUserID) {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings object is required');
    }

    const aID = this._toInt(adminUserID, null);
    if (!aID) {
      throw new Error('adminUserID is required');
    }

    const adminExists = await this._adminExists(aID);
    if (!adminExists) {
      throw new Error('Admin user not found');
    }

    const entries = Object.entries(settings)
      .map(([k, v]) => [this._ensureKey(k), this._toString(v)]);

    if (entries.length === 0) return {};

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      for (const [k, v] of entries) {
        await connection.query(
          `INSERT INTO settings (adminUserID, setting_key, setting_value)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), adminUserID = VALUES(adminUserID)`,
          [aID, k, v]
        );
      }

      await connection.commit();

      const out = {};
      for (const [k, v] of entries) out[k] = v;
      return out;
    } catch (err) {
      try {
        await connection.rollback();
      } catch (_) {}
      throw err;
    } finally {
      connection.release();
    }
  }

  static async delete(settingKey) {
    const k = this._ensureKey(settingKey);

    const [result] = await db.query(
      'DELETE FROM settings WHERE setting_key = ?',
      [k]
    );

    if (result.affectedRows === 0) {
      throw new Error('Setting not found');
    }

    return { success: true, message: 'Setting deleted successfully' };
  }

  // ---------- domain helpers ----------
  static async getTicketPrices() {
    const keys = ['ticket_price_vip', 'ticket_price_regular', 'ticket_price_student'];
    const s = await this.getByKeys(keys);

    return {
      vip: this._toInt(s.ticket_price_vip, 0),
      regular: this._toInt(s.ticket_price_regular, 0),
      student: this._toInt(s.ticket_price_student, 0),
    };
  }

  static async setTicketPrices(prices, adminUserID) {
    if (!prices || typeof prices !== 'object') {
      throw new Error('Ticket prices are required');
    }

    const vip = this._toInt(prices.vip, NaN);
    const regular = this._toInt(prices.regular, NaN);
    const student = this._toInt(prices.student, NaN);

    if (![vip, regular, student].every((n) => Number.isFinite(n) && n >= 0)) {
      throw new Error('Invalid ticket prices');
    }

    return this.setMultiple({
      ticket_price_vip: String(vip),
      ticket_price_regular: String(regular),
      ticket_price_student: String(student),
    }, adminUserID);
  }

  static async getClubInfo() {
    const keys = [
      'club_name',
      'club_slogan',
      'club_nickname',
      'club_location',
      'club_email',
      'club_phone',
    ];
    return this.getByKeys(keys);
  }

  static async setClubInfo(info, adminUserID) {
    if (!info || typeof info !== 'object') {
      throw new Error('Club info object is required');
    }

    const settings = {};

    if (info.club_name || info.name) settings.club_name = this._toString(info.club_name ?? info.name);
    if (info.club_slogan || info.slogan) settings.club_slogan = this._toString(info.club_slogan ?? info.slogan);
    if (info.club_nickname || info.nickname) settings.club_nickname = this._toString(info.club_nickname ?? info.nickname);
    if (info.club_location || info.location) settings.club_location = this._toString(info.club_location ?? info.location);
    if (info.club_email || info.email) settings.club_email = this._toString(info.club_email ?? info.email);
    if (info.club_phone || info.phone) settings.club_phone = this._toString(info.club_phone ?? info.phone);

    if (Object.keys(settings).length === 0) {
      throw new Error('No valid club info fields provided');
    }

    return this.setMultiple(settings, adminUserID);
  }

  static async getMembershipFee() {
    const value = await this.getByKey('membership_fee');
    return this._toInt(value, 0);
  }

  static async setMembershipFee(fee, adminUserID) {
    const n = this._toInt(fee, NaN);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('Invalid membership fee');
    }
    return this.set('membership_fee', String(n), adminUserID);
  }
}

module.exports = Settings;