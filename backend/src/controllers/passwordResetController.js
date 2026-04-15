// backend/src/controllers/passwordResetController.js
const PasswordReset = require('../models/PasswordReset');
const { resetLimiter, resetVerifyLimiter } = require('../middleware/rateLimiter');

const VALIDATION = {
  password: { min: 8, max: 128 },
};

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// Sends a reset token to the user's email
// ─────────────────────────────────────────────
exports.forgotPassword = [
  resetLimiter,
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Try to find user in both tables
      let isAdmin = false;
      let userInfo = null;

      // Check admin_users first
      const adminRows = await require('../config/database').execute(
        'SELECT adminUserID, email, full_name FROM admin_users WHERE email = ? AND is_active = TRUE LIMIT 1',
        [cleanEmail]
      );

      if (adminRows[0].length > 0) {
        isAdmin = true;
        userInfo = adminRows[0][0];
      } else {
        // Check users table
        const userRows = await require('../config/database').execute(
          'SELECT userID, email, full_name FROM users WHERE email = ? AND is_active = TRUE LIMIT 1',
          [cleanEmail]
        );
        if (userRows[0].length > 0) {
          isAdmin = false;
          userInfo = userRows[0][0];
        }
      }

      // Always return success to prevent email enumeration
      if (!userInfo) {
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a reset code has been sent.',
        });
      }

      // Create reset token
      const resetData = await PasswordReset.createToken(cleanEmail, isAdmin);

      if (!resetData) {
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a reset code has been sent.',
        });
      }

      // In production, you would send this token via email
      // For now, we return it in the response for testing
      // TODO: Integrate nodemailer or similar for email delivery
      console.log(`[PASSWORD RESET] Token for ${cleanEmail}: ${resetData.token}`);

      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset code has been sent.',
        // Remove this in production - only for development
        token: process.env.NODE_ENV === 'development' ? resetData.token : undefined,
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during password reset request',
      });
    }
  },
];

// ─────────────────────────────────────────────
// POST /api/auth/reset-password/verify
// Verify that a reset token is valid
// ─────────────────────────────────────────────
exports.verifyResetToken = [
  resetVerifyLimiter,
  async (req, res) => {
    try {
      const { token } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid reset token',
        });
      }

      const userInfo = await PasswordReset.validateToken(token);

      if (!userInfo) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Token is valid',
        email: userInfo.email,
        full_name: userInfo.full_name,
      });
    } catch (error) {
      console.error('Verify reset token error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during token verification',
      });
    }
  },
];

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// Reset password using a valid token
// ─────────────────────────────────────────────
exports.resetPassword = [
  resetVerifyLimiter,
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid reset token',
        });
      }

      if (!newPassword || typeof newPassword !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Please provide a new password',
        });
      }

      if (
        newPassword.length < VALIDATION.password.min ||
        newPassword.length > VALIDATION.password.max
      ) {
        return res.status(400).json({
          success: false,
          message: `Password must be ${VALIDATION.password.min}–${VALIDATION.password.max} characters`,
        });
      }

      const result = await PasswordReset.resetPassword(token, newPassword);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during password reset',
      });
    }
  },
];
