// Auth routes
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const passwordResetController = require('../controllers/passwordResetController');
const auth = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/login', loginLimiter, authController.login);
router.post('/signup/user', authController.signupUser);

// Password reset routes
router.post('/forgot-password', passwordResetController.forgotPassword);
router.post('/reset-password/verify', passwordResetController.verifyResetToken);
router.post('/reset-password', passwordResetController.resetPassword);

// Protected routes
router.post(
  '/signup/admin',
  auth,
  auth.isAdmin,
  auth.requireRole(['super_admin']),
  authController.signupAdmin
);

router.post('/logout', auth, authController.logout);
router.get('/verify', auth, authController.verifyToken);
router.get('/profile', auth, authController.getProfile);

module.exports = router;