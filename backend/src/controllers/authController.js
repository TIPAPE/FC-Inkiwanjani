// backend/src/controllers/authController.js
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Fail-safe: never run auth without a real secret
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set in .env');
}

// Generate JWT token
const generateToken = (user, isAdmin = false) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on the server');
  }

  // Normalize role:
  // - Admins: super_admin | admin | editor (from admin_users table)
  // - Users: "user"
  const role = isAdmin ? (user.role || 'editor') : 'user';

  return jwt.sign(
    {
      id: user.id,
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

// Helper: sanitize user objects before sending to client
const sanitizeUser = (user, isAdmin = false) => {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone || null,
    role: isAdmin ? (user.role || 'editor') : 'user',
    isAdmin,
  };
};

// User Signup
exports.signupUser = async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    // Validation
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Check if user already exists
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const existingUserByUsername = await User.findByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken',
      });
    }

    // Create user
    const user = await User.create({ username, email, password, full_name, phone });

    // Generate token
    const token = generateToken(user, false);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: sanitizeUser(user, false),
      },
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    return res.status(500).json({
      success: false,
      message: error.message?.includes('JWT_SECRET')
        ? 'Server auth configuration error'
        : 'Server error during registration',
    });
  }
};

// Admin Signup
exports.signupAdmin = async (req, res) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    // Validation
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Optional: enforce allowed roles according to schema
    const allowedRoles = ['super_admin', 'admin', 'editor'];
    const finalRole = role && allowedRoles.includes(role) ? role : 'editor';

    // Check if admin already exists
    const existingAdminByEmail = await AdminUser.findByEmail(email);
    if (existingAdminByEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const existingAdminByUsername = await AdminUser.findByUsername(username);
    if (existingAdminByUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken',
      });
    }

    // Create admin
    const admin = await AdminUser.create({
      username,
      email,
      password,
      full_name,
      role: finalRole,
    });

    // Generate token
    const token = generateToken(admin, true);

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: {
        token,
        user: sanitizeUser(admin, true),
      },
    });
  } catch (error) {
    console.error('❌ Admin signup error:', error);
    return res.status(500).json({
      success: false,
      message: error.message?.includes('JWT_SECRET')
        ? 'Server auth configuration error'
        : 'Server error during registration',
    });
  }
};

// Login (works for both users and admins)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check admin first
    let user = await AdminUser.findByEmail(email);
    let isAdmin = true;

    // If not admin, check regular users
    if (!user) {
      user = await User.findByEmail(email);
      isAdmin = false;
    }

    // User not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = isAdmin
      ? await AdminUser.verifyPassword(password, user.password_hash)
      : await User.verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Update last login
    if (isAdmin) {
      await AdminUser.updateLastLogin(user.id);
    } else {
      await User.updateLastLogin(user.id);
    }

    // Generate token
    const token = generateToken(user, isAdmin);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: sanitizeUser(user, isAdmin),
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message?.includes('JWT_SECRET')
        ? 'Server auth configuration error'
        : 'Server error during login',
    });
  }
};

// Verify JWT token (frontend calls GET /api/auth/verify)
exports.verifyToken = async (req, res) => {
  try {
    // If auth middleware attached req.user, token is valid
    return res.status(200).json({
      success: true,
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
        isAdmin: !!req.user.isAdmin,
        type: req.user.type || (req.user.isAdmin ? 'admin' : 'user'),
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      valid: false,
      message: 'Invalid or expired token',
    });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = !!req.user.isAdmin || req.user.type === 'admin';

    let user;
    if (isAdmin) {
      user = await AdminUser.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Never return password_hash even if model includes it
    return res.status(200).json({
      success: true,
      data: sanitizeUser(user, isAdmin),
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
