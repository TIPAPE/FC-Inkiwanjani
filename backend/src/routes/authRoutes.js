// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

// POST /api/auth/login
router.post('/login', loginLimiter, authController.login);

// POST /api/auth/signup/user
router.post('/signup/user', authController.signupUser);

// ─────────────────────────────────────────────
// PROTECTED ROUTES
// ─────────────────────────────────────────────

// POST /api/auth/signup/admin — only super_admin may create new admins
router.post(
  '/signup/admin',
  auth,
  auth.isAdmin,
  auth.requireRole(['super_admin']),
  authController.signupAdmin
);

// GET /api/auth/verify
router.get('/verify', auth, authController.verifyToken);

// GET /api/auth/profile
router.get('/profile', auth, authController.getProfile);


module.exports = router;