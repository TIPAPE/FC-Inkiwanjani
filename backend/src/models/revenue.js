// backend/src/models/Revenue.js
const db = require('../config/database');

class Revenue {
  // ---------- helpers ----------
  static _toString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  static _toMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return NaN;
    // keep 2dp
    return Math.round(n * 100) / 100;
  }

  static _isValidDateString(d) {
    // expects YYYY-MM-DD
    return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  }

  static _normalizeDateInput(date) {
    // revenue.transaction_date is DATE (not DATETIME)
    // We accept:
    //  - YYYY-MM-DD (recommended)
    //  - JS Date (will be converted to YYYY-MM-DD)
    if (!date) return null;

    if (this._isValidDateString(date)) return date;

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    // If something else was passed (like ISO datetime string),
    // try to take the first 10 chars if it matches YYYY-MM-DD
    if (typeof date === 'string' && this._isValidDateString(date.slice(0, 10))) {
      return date.slice(0, 10);
    }

    return null;
  }

  static _validateSource(source) {
    const s = this._toString(source);
    const allowed = new Set(['tickets', 'merchandise', 'membership', 'sponsorship', 'other']);
    if (!allowed.has(s)) {
      throw new Error(`Invalid revenue source. Allowed: ${Array.from(allowed).join(', ')}`);
    }
    return s;
  }

  static _validateId(id) {
    const n = Number.parseInt(id, 10);
    if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid revenue id');
    return n;
  }

  // ---------- CRUD ----------
  static async getAll() {
    const [rows] = await db.query(
      'SELECT * FROM revenue ORDER BY transaction_date DESC, id DESC'
    );
    return rows;
  }

  static async getBySource(source) {
    const s = this._validateSource(source);
    const [rows] = await db.query(
      'SELECT * FROM revenue WHERE source = ? ORDER BY transaction_date DESC, id DESC',
      [s]
    );
    return rows;
  }

  static async getByDateRange(startDate, endDate) {
    const start = this._normalizeDateInput(startDate);
    const end = this._normalizeDateInput(endDate);

    if (!start || !end) {
      throw new Error('startDate and endDate must be valid dates (YYYY-MM-DD)');
    }

    const [rows] = await db.query(
      `SELECT * FROM revenue
       WHERE transaction_date BETWEEN ? AND ?
       ORDER BY transaction_date DESC, id DESC`,
      [start, end]
    );

    return rows;
  }

  static async create(revenueData) {
    const source = this._validateSource(revenueData?.source);
    const amount = this._toMoney(revenueData?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    const descriptionRaw = revenueData?.description;
    const description = descriptionRaw === undefined ? null : this._toString(descriptionRaw) || null;

    const transaction_date =
      this._normalizeDateInput(revenueData?.transaction_date) ||
      this._normalizeDateInput(new Date()); // defaults to today (YYYY-MM-DD)

    // transaction_date is DATE so we store 'YYYY-MM-DD'
    const [result] = await db.query(
      `INSERT INTO revenue (source, amount, description, transaction_date)
       VALUES (?, ?, ?, ?)`,
      [source, amount, description, transaction_date]
    );

    return {
      id: result.insertId,
      source,
      amount,
      description,
      transaction_date,
    };
  }

  static async update(id, revenueData) {
    const revenueId = this._validateId(id);

    const source = this._validateSource(revenueData?.source);
    const amount = this._toMoney(revenueData?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    const descriptionRaw = revenueData?.description;
    const description = descriptionRaw === undefined ? null : this._toString(descriptionRaw) || null;

    const transaction_date = this._normalizeDateInput(revenueData?.transaction_date);
    if (!transaction_date) {
      throw new Error('transaction_date must be a valid date (YYYY-MM-DD)');
    }

    const [result] = await db.query(
      `UPDATE revenue
       SET source = ?, amount = ?, description = ?, transaction_date = ?
       WHERE id = ?`,
      [source, amount, description, transaction_date, revenueId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Revenue record not found');
    }

    const [rows] = await db.query('SELECT * FROM revenue WHERE id = ?', [revenueId]);
    return rows[0] || null;
  }

  static async delete(id) {
    const revenueId = this._validateId(id);

    const [result] = await db.query('DELETE FROM revenue WHERE id = ?', [revenueId]);

    if (result.affectedRows === 0) {
      throw new Error('Revenue record not found');
    }

    return { success: true, message: 'Revenue record deleted successfully' };
  }

  // ---------- reports ----------
  static async getSummary(startDate = null, endDate = null) {
    const start = startDate ? this._normalizeDateInput(startDate) : null;
    const end = endDate ? this._normalizeDateInput(endDate) : null;

    if ((startDate || endDate) && (!start || !end)) {
      throw new Error('If filtering, provide startDate and endDate as YYYY-MM-DD');
    }

    let query = `
      SELECT
        source,
        SUM(amount) AS total_amount,
        COUNT(*) AS transaction_count
      FROM revenue
    `;
    const params = [];

    if (start && end) {
      query += ' WHERE transaction_date BETWEEN ? AND ?';
      params.push(start, end);
    }

    query += ' GROUP BY source ORDER BY total_amount DESC';

    const [rows] = await db.query(query, params);

    const total = rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);

    return {
      range: start && end ? { start_date: start, end_date: end } : null,
      breakdown: rows.map((r) => ({
        source: r.source,
        total_amount: Number(r.total_amount || 0),
        transaction_count: Number(r.transaction_count || 0),
      })),
      total_revenue: Math.round(total * 100) / 100,
    };
  }

  static async getMonthlyRevenue(year, month) {
    const y = Number.parseInt(year, 10);
    const m = Number.parseInt(month, 10);

    if (!Number.isFinite(y) || y < 1970 || y > 3000) {
      throw new Error('Invalid year');
    }
    if (!Number.isFinite(m) || m < 1 || m > 12) {
      throw new Error('Invalid month');
    }

    const [rows] = await db.query(
      `SELECT
         source,
         SUM(amount) AS total_amount,
         COUNT(*) AS transaction_count
       FROM revenue
       WHERE YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
       GROUP BY source
       ORDER BY total_amount DESC`,
      [y, m]
    );

    const total = rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);

    return {
      year: y,
      month: m,
      breakdown: rows.map((r) => ({
        source: r.source,
        total_amount: Number(r.total_amount || 0),
        transaction_count: Number(r.transaction_count || 0),
      })),
      total_revenue: Math.round(total * 100) / 100,
    };
  }

  static async getYearlyRevenue(year) {
    const y = Number.parseInt(year, 10);
    if (!Number.isFinite(y) || y < 1970 || y > 3000) {
      throw new Error('Invalid year');
    }

    const [rows] = await db.query(
      `SELECT
         MONTH(transaction_date) AS month,
         source,
         SUM(amount) AS total_amount,
         COUNT(*) AS transaction_count
       FROM revenue
       WHERE YEAR(transaction_date) = ?
       GROUP BY MONTH(transaction_date), source
       ORDER BY month ASC, source ASC`,
      [y]
    );

    return rows.map((r) => ({
      month: Number(r.month),
      source: r.source,
      total_amount: Number(r.total_amount || 0),
      transaction_count: Number(r.transaction_count || 0),
    }));
  }

  static async getTotal() {
    const [rows] = await db.query('SELECT SUM(amount) AS total FROM revenue');
    const total = Number(rows[0]?.total || 0);
    return Math.round(total * 100) / 100;
  }
}

module.exports = Revenue;
