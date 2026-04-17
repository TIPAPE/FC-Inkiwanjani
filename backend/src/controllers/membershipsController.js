// backend/src/controllers/membershipsController.js
const db = require('../config/database');

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const sendSuccess = (res, status, data, message) =>
  res.status(status).json({ success: true, message, data });

const safeTrim = (v) => (typeof v === 'string' ? v.trim() : v);
const toFloat = (v) => { const n = Number.parseFloat(v); return Number.isFinite(n) ? n : null; };

const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
};

// Create membership
exports.create = async (req, res) => {
  try {
    const full_name = safeTrim(req.body?.full_name);
    const email = safeTrim(req.body?.email)?.toLowerCase();
    const phone = safeTrim(req.body?.phone);

    if (!full_name || !email || !phone) {
      return sendError(res, 400, 'full_name, email, and phone are required');
    }
    if (!isValidEmail(email)) {
      return sendError(res, 400, 'Invalid email address');
    }
    if (full_name.length < 2 || full_name.length > 100) {
      return sendError(res, 400, 'Full name must be between 2 and 100 characters');
    }

    // Get membership fee from settings
    const [settingsRows] = await db.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'membership_fee' LIMIT 1"
    );
    const membership_fee = settingsRows.length ? toFloat(settingsRows[0].setting_value) || 50 : 50;

    // Check if user exists
    let userID = null;
    const [existingUsers] = await db.query(
      'SELECT userID FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existingUsers.length) {
      userID = existingUsers[0].userID;
    }

    // Check if membership already exists
    const [existingMemberships] = await db.query(
      'SELECT membershipID FROM memberships WHERE email = ? AND is_active = TRUE LIMIT 1',
      [email]
    );
    if (existingMemberships.length) {
      return sendError(res, 400, 'You already have an active membership');
    }

    // Generate membership number
    const membership_number = `FCI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const join_date = new Date().toISOString().slice(0, 10);
    const expiry_date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Insert membership
    const [result] = await db.query(
      `INSERT INTO memberships (userID, full_name, email, phone, membership_number, membership_fee, join_date, expiry_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [userID, full_name, email, phone, membership_number, membership_fee, join_date, expiry_date]
    );

    // ✅ Create revenue record for the membership fee
    const description = `Membership fee for ${full_name} (${membership_number})`;
    await db.query(
      `INSERT INTO revenue (source, amount, description, transaction_date)
       VALUES ('membership', ?, ?, ?)`,
      [membership_fee, description, join_date]
    ).catch(err => console.error('Failed to auto-create revenue for membership:', err));

    return sendSuccess(res, 201, {
      membershipID: result.insertId,
      membership_number,
      full_name,
      email,
      join_date,
      expiry_date,
      membership_fee,
    }, 'Membership registered successfully');
  } catch (error) {
    console.error('Create membership error:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return sendError(res, 400, 'Membership already exists');
    }
    return sendError(res, 500, 'Failed to register membership');
  }
};