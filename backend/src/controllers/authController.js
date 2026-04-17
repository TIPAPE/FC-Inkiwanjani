// backend/src/controllers/authController.js
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env');
}

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

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    let user = await AdminUser.findByEmail(email);
    let isAdmin = true;

    if (!user) {
      user = await User.findByEmail(email);
      isAdmin = false;
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isPasswordValid = isAdmin
      ? await AdminUser.verifyPassword(password, user.password_hash)
      : await User.verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const userId = isAdmin ? user.adminUserID : user.userID;
    if (isAdmin) {
      await AdminUser.updateLastLogin(userId);
    } else {
      await User.updateLastLogin(userId);
    }

    const token = generateToken(user, isAdmin);

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
// POST /api/auth/logout
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
// GET /api/auth/verify
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
// GET /api/auth/profile
// ─────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
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

// ─────────────────────────────────────────────
// PUT /api/auth/profile
// ─────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin || req.user.type === 'admin';
    const { full_name, phone } = req.body;

    // Validation
    if (full_name !== undefined && (typeof full_name !== 'string' || full_name.trim().length < 2)) {
      return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters' });
    }
    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}$/;
      if (!phoneRegex.test(phone.trim())) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format' });
      }
    }

    let updatedUser;
    if (isAdmin) {
      updatedUser = await AdminUser.updateProfile(userId, { full_name: full_name?.trim(), phone: phone?.trim() });
    } else {
      updatedUser = await User.updateProfile(userId, { full_name: full_name?.trim(), phone: phone?.trim() });
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/change-password
// ─────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin || req.user.type === 'admin';
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    let success;
    if (isAdmin) {
      success = await AdminUser.changePassword(userId, { current_password, new_password });
    } else {
      success = await User.changePassword(userId, { current_password, new_password });
    }

    if (!success) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect or user not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};