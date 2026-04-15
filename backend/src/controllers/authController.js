// backend/src/controllers/authController.js
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Halt startup if JWT secret is missing
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env');
}

/**
 * Generates a signed JWT for the given user.
 */
const generateToken = (user, isAdmin = false) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on the server');
  }

  const role = isAdmin ? (user.role || 'editor') : 'user';
  const userId = isAdmin ? user.adminUserID : user.userID;

  return jwt.sign(
    {
      id: userId,
      email: user.email,
      username: user.username,
      isAdmin,
      type: isAdmin ? 'admin' : 'user',
      role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Returns a safe (no password hash) user object.
 *
 * BUG FIX: The frontend (authService / authStorage) reads response.token and
 * response.user at the top level — e.g. `const { token, user } = await authService.login()`.
 * The old controller nested these inside `data: { token, user }`, so the frontend
 * always received undefined for both fields, meaning:
 *   - authStorage.saveAuth(undefined, undefined) stored nothing.
 *   - AdminScreen's token state was always null.
 *   - logout() called authService.logout(null), so the Authorization header
 *     was never sent and the server never blocklisted the token.
 *
 * Fix: return token and user at the top level of the response body.
 */
const sanitizeUser = (user, isAdmin = false) => {
  if (!user) return null;

  return {
    id: isAdmin ? user.adminUserID : user.userID,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone || null,
    role: isAdmin ? (user.role || 'editor') : 'user',
    isAdmin,
    type: isAdmin ? 'admin' : 'user',
  };
};

// ─────────────────────────────────────────────
// POST /api/auth/signup/user
// ─────────────────────────────────────────────
exports.signupUser = async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const existingByEmail = await User.findByEmail(email);
    if (existingByEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const existingByUsername = await User.findByUsername(username);
    if (existingByUsername) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const user = await User.create({ username, email, password, full_name, phone });
    const token = generateToken(user, false);

    // ✅ FIX: token and user returned at top level, not nested under `data`
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: sanitizeUser(user, false),
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: error.message?.includes('JWT_SECRET')
        ? 'Server authentication configuration error'
        : 'Server error during registration',
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/signup/admin
// ─────────────────────────────────────────────
exports.signupAdmin = async (req, res) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const allowedRoles = ['super_admin', 'admin', 'editor'];
    const finalRole = role && allowedRoles.includes(role) ? role : 'editor';

    const existingByEmail = await AdminUser.findByEmail(email);
    if (existingByEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const existingByUsername = await AdminUser.findByUsername(username);
    if (existingByUsername) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const admin = await AdminUser.create({ username, email, password, full_name, role: finalRole });
    const token = generateToken(admin, true);

    // ✅ FIX: token and user returned at top level
    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      token,
      user: sanitizeUser(admin, true),
    });
  } catch (error) {
    console.error('Admin signup error:', error);
    return res.status(500).json({
      success: false,
      message: error.message?.includes('JWT_SECRET')
        ? 'Server authentication configuration error'
        : 'Server error during registration',
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[LOGIN DEBUG] Login attempt received:');
    console.log('[LOGIN DEBUG]   Email:', email);
    console.log('[LOGIN DEBUG]   Password length:', password?.length);

    if (!email || !password) {
      console.log('[LOGIN DEBUG]   ❌ Missing email or password');
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    let user = await AdminUser.findByEmail(email);
    let isAdmin = true;
    console.log('[LOGIN DEBUG]   Searched admin_users, found:', user ? 'YES' : 'NO');

    if (!user) {
      user = await User.findByEmail(email);
      isAdmin = false;
      console.log('[LOGIN DEBUG]   Searched users, found:', user ? 'YES' : 'NO');
    }

    if (!user) {
      console.log('[LOGIN DEBUG]   ❌ No user found with email:', email);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log('[LOGIN DEBUG]   User found, isAdmin:', isAdmin);
    console.log('[LOGIN DEBUG]   User ID:', isAdmin ? user.adminUserID : user.userID);
    console.log('[LOGIN DEBUG]   User email:', user.email);
    console.log('[LOGIN DEBUG]   Password hash exists:', !!user.password_hash);

    const isPasswordValid = isAdmin
      ? await AdminUser.verifyPassword(password, user.password_hash)
      : await User.verifyPassword(password, user.password_hash);

    console.log('[LOGIN DEBUG]   Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('[LOGIN DEBUG]   ❌ Invalid password for user:', email);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const userId = isAdmin ? user.adminUserID : user.userID;
    if (isAdmin) {
      await AdminUser.updateLastLogin(userId);
    } else {
      await User.updateLastLogin(userId);
    }

    const token = generateToken(user, isAdmin);
    console.log('[LOGIN DEBUG]   ✅ Login successful, token generated');

    // ✅ FIX: token and user returned at top level so the frontend can read them
    // directly: const { token, user } = await authService.login(email, password)
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: sanitizeUser(user, isAdmin),
    });
  } catch (error) {
    console.error('[LOGIN ERROR] Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message?.includes('JWT_SECRET')
        ? 'Server authentication configuration error'
        : 'Server error during login',
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/logout  (protected by auth middleware)
// ─────────────────────────────────────────────
const { addToBlocklist } = require('../middleware/tokenBlocklist');

exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const exp = req.user?.exp;

    if (token) {
      addToBlocklist(token, exp);
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('[LOGOUT ERROR] Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/auth/verify  (protected by auth middleware)
// ─────────────────────────────────────────────
exports.verifyToken = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      valid: true,
      user: req.user,
    });
  } catch {
    return res.status(401).json({ success: false, valid: false, message: 'Invalid or expired token' });
  }
};

// ─────────────────────────────────────────────
// GET /api/auth/profile  (protected by auth middleware)
// ─────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const userId  = req.user.id;
    const isAdmin = !!req.user.isAdmin || req.user.type === 'admin';

    const user = isAdmin
      ? await AdminUser.findById(userId)
      : await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      data: sanitizeUser(user, isAdmin),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};