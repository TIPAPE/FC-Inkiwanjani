// backend/src/models/Booking.js
const db = require('../config/database');

class Booking {
  static _toInt(value, fallback = null) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  static _toNumber(value, fallback = null) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  static _toString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  static _normalizeEmail(email) {
    return this._toString(email).toLowerCase();
  }

  static _isValidTicketType(type) {
    return ['vip', 'regular', 'student'].includes(type);
  }

  static _roundMoney(value) {
    // keep to 2 decimals consistently
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  // Stronger unique booking reference:
  // - Uses a date prefix + random bytes to reduce collision risk
  static generateReference() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const rand = require('crypto').randomBytes(5).toString('hex').toUpperCase(); // 10 chars
    return `BK${datePart}${rand}`;
  }

  static async _matchExists(matchID) {
    const [rows] = await db.query('SELECT matchID FROM matches WHERE matchID = ? LIMIT 1', [matchID]);
    return !!rows[0];
  }

  // Check if user exists
  static async _userExists(userID) {
    const [rows] = await db.query('SELECT userID FROM users WHERE userID = ? AND is_active = TRUE LIMIT 1', [userID]);
    return !!rows[0];
  }

  // Get all bookings (includes match and user info — uses LEFT JOIN for guest bookings without userID)
  static async getAll() {
    const [rows] = await db.query(
      `SELECT b.*, m.opponent, m.match_date, m.venue, m.status as match_status, u.full_name as user_name, u.email as user_email
       FROM bookings b
       LEFT JOIN matches m ON b.matchID = m.matchID
       LEFT JOIN users u ON b.userID = u.userID
       ORDER BY b.booking_date DESC`
    );
    return rows;
  }

  // Get paginated bookings
  static async getAllPaginated(offset, limit) {
    const [rows] = await db.query(
      `SELECT b.*, m.opponent, m.match_date, m.venue, u.full_name as user_name, u.email as user_email
       FROM bookings b
       LEFT JOIN matches m ON b.matchID = m.matchID
       LEFT JOIN users u ON b.userID = u.userID
       ORDER BY b.booking_date DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  }

  // Get total count of bookings
  static async getCount() {
    const [rows] = await db.query('SELECT COUNT(*) as total FROM bookings');
    return rows[0]?.total || 0;
  }

  // Get booking by ID
  static async getById(bookingID) {
    const id = this._toInt(bookingID, null);
    if (!id) return null;

    const [rows] = await db.query(
      `SELECT b.*, m.opponent, m.match_date, m.venue, u.full_name as user_name, u.email as user_email
       FROM bookings b
       LEFT JOIN matches m ON b.matchID = m.matchID
       LEFT JOIN users u ON b.userID = u.userID
       WHERE b.bookingID = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // Get booking by reference
  static async getByReference(reference) {
    const ref = this._toString(reference);
    if (!ref) return null;

    const [rows] = await db.query(
      `SELECT b.*, m.opponent, m.match_date, m.venue, u.full_name as user_name, u.email as user_email
       FROM bookings b
       LEFT JOIN matches m ON b.matchID = m.matchID
       LEFT JOIN users u ON b.userID = u.userID
       WHERE b.booking_reference = ?`,
      [ref]
    );
    return rows[0] || null;
  }

  // Get bookings by match
  static async getByMatch(matchID) {
    const mId = this._toInt(matchID, null);
    if (!mId) return [];

    const [rows] = await db.query(
      `SELECT b.*, u.full_name as user_name, u.email as user_email
       FROM bookings b
       LEFT JOIN users u ON b.userID = u.userID
       WHERE b.matchID = ?
       ORDER BY b.booking_date DESC`,
      [mId]
    );
    return rows;
  }

  // Get bookings by user
  static async getByUser(userID) {
    const uId = this._toInt(userID, null);
    if (!uId) return [];

    const [rows] = await db.query(
      `SELECT b.*, m.opponent, m.match_date, m.venue
       FROM bookings b
       LEFT JOIN matches m ON b.matchID = m.matchID
       WHERE b.userID = ?
       ORDER BY b.booking_date DESC`,
      [uId]
    );
    return rows;
  }

  // Get bookings by email
  static async getByEmail(email) {
    const normalized = this._normalizeEmail(email);
    if (!normalized) return [];

    const [rows] = await db.query(
      `SELECT b.*, m.opponent, m.match_date, m.venue, u.full_name as user_name
       FROM bookings b
       LEFT JOIN matches m ON b.matchID = m.matchID
       LEFT JOIN users u ON b.userID = u.userID
       WHERE b.customer_email = ?
       ORDER BY b.booking_date DESC`,
      [normalized]
    );
    return rows;
  }

  // Create booking
  static async create(bookingData) {
    const matchID = this._toInt(bookingData?.matchID || bookingData?.match_id, null);
    const userID = bookingData?.userID ? this._toInt(bookingData.userID, null) : null;  // userID is optional
    const customer_name = this._toString(bookingData?.customer_name);
    const customer_email = this._normalizeEmail(bookingData?.customer_email);
    const customer_phone = this._toString(bookingData?.customer_phone);
    const ticket_type = this._toString(bookingData?.ticket_type);
    const quantity = this._toInt(bookingData?.quantity, null);

    // total_amount comes from client -- validate it
    const total_amount_raw = this._toNumber(bookingData?.total_amount, null);

    if (
      !matchID ||
      !customer_name ||
      !customer_email ||
      !customer_phone ||
      !ticket_type ||
      !quantity
    ) {
      throw new Error('All fields are required');
    }

    if (!this._isValidTicketType(ticket_type)) {
      throw new Error('Invalid ticket type');
    }

    if (quantity <= 0 || quantity > 50) {
      // simple abuse guard; adjust if needed
      throw new Error('Invalid quantity');
    }

    // Ensure match exists
    const matchExists = await this._matchExists(matchID);
    if (!matchExists) {
      throw new Error('Match not found');
    }

    // userID is optional - if provided, ensure user exists
    if (userID !== null) {
      const userExists = await this._userExists(userID);
      if (!userExists) {
        throw new Error('User not found');
      }
    }

    // Money validation
    if (total_amount_raw === null || total_amount_raw < 0) {
      throw new Error('Invalid total amount');
    }
    const total_amount = this._roundMoney(total_amount_raw);

    // Default payment status is 'paid'
    const payment_status = 'paid';

    // Insert with retry on reference collision (very rare, but safe)
    let booking_reference = null;
    let attempt = 0;

    while (attempt < 5) {
      attempt += 1;
      booking_reference = this.generateReference();

      try {
        const [result] = await db.query(
          `INSERT INTO bookings
           (matchID, userID, customer_name, customer_email, customer_phone,
            ticket_type, quantity, total_amount, booking_reference, payment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            matchID,
            userID,
            customer_name,
            customer_email,
            customer_phone,
            ticket_type,
            quantity,
            total_amount,
            booking_reference,
            payment_status,
          ]
        );

        return {
          bookingID: result.insertId,
          matchID,
          userID,
          customer_name,
          customer_email,
          customer_phone,
          ticket_type,
          quantity,
          total_amount,
          booking_reference,
          payment_status,
        };
      } catch (error) {
        // Duplicate booking_reference - regenerate and retry
        if (error?.code === 'ER_DUP_ENTRY' && String(error?.message || '').includes('booking_reference')) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to generate booking reference');
  }

  // Update payment status
  static async updatePaymentStatus(bookingID, status) {
    const id = this._toInt(bookingID, null);
    if (!id) throw new Error('Booking not found');

    const s = this._toString(status);
    const allowed = ['pending', 'paid', 'cancelled'];

    if (!allowed.includes(s)) {
      throw new Error(`Invalid payment status. Allowed: ${allowed.join(', ')}`);
    }

    const [result] = await db.query(
      'UPDATE bookings SET payment_status = ? WHERE bookingID = ?',
      [s, id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Booking not found');
    }

    return this.getById(id);
  }

  // Cancel booking
  static async cancel(bookingID) {
    const id = this._toInt(bookingID, null);
    if (!id) throw new Error('Booking not found');

    const [result] = await db.query(
      'UPDATE bookings SET payment_status = ? WHERE bookingID = ?',
      ['cancelled', id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Booking not found');
    }

    return { success: true, message: 'Booking cancelled successfully' };
  }

  // Delete booking
  static async delete(bookingID) {
    const id = this._toInt(bookingID, null);
    if (!id) throw new Error('Booking not found');

    const [result] = await db.query('DELETE FROM bookings WHERE bookingID = ?', [id]);

    if (result.affectedRows === 0) {
      throw new Error('Booking not found');
    }

    return { success: true, message: 'Booking deleted successfully' };
  }

  // Booking statistics
  static async getStats() {
    const [stats] = await db.query(
      `SELECT
         COUNT(*) as total_bookings,
         SUM(quantity) as total_tickets,
         SUM(total_amount) as total_revenue,
         SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue,
         SUM(CASE WHEN ticket_type = 'vip' THEN quantity ELSE 0 END) as vip_tickets,
         SUM(CASE WHEN ticket_type = 'regular' THEN quantity ELSE 0 END) as regular_tickets,
         SUM(CASE WHEN ticket_type = 'student' THEN quantity ELSE 0 END) as student_tickets
       FROM bookings`
    );

    // Normalize null sums to 0
    const row = stats[0] || {};
    return {
      total_bookings: row.total_bookings || 0,
      total_tickets: row.total_tickets || 0,
      total_revenue: Number(row.total_revenue || 0),
      paid_revenue: Number(row.paid_revenue || 0),
      vip_tickets: row.vip_tickets || 0,
      regular_tickets: row.regular_tickets || 0,
      student_tickets: row.student_tickets || 0,
    };
  }

  // Revenue by match
  static async getRevenueByMatch() {
    const [rows] = await db.query(
      `SELECT
         m.matchID,  
         m.opponent,
         m.match_date,
         COUNT(b.bookingID) as total_bookings,
         COALESCE(SUM(b.quantity), 0) as total_tickets,
         COALESCE(SUM(b.total_amount), 0) as total_revenue,
         COALESCE(SUM(CASE WHEN b.ticket_type = 'vip' THEN b.quantity ELSE 0 END), 0) as vip_tickets,
         COALESCE(SUM(CASE WHEN b.ticket_type = 'regular' THEN b.quantity ELSE 0 END), 0) as regular_tickets,
         COALESCE(SUM(CASE WHEN b.ticket_type = 'student' THEN b.quantity ELSE 0 END), 0) as student_tickets
       FROM matches m
       LEFT JOIN bookings b ON m.matchID = b.matchID
       GROUP BY m.matchID, m.opponent, m.match_date
       ORDER BY m.match_date DESC`
    );
    return rows;
  }
}

module.exports = Booking;