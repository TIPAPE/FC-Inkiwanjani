// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

//  AUTH ROUTES 

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/signup/user
router.post('/signup/user', authController.signupUser);


router.post(
  '/signup/admin',
  auth,
  auth.isAdmin,
  auth.requireRole(['super_admin']),
  authController.signupAdmin
);

// GET /api/auth/verify  (Protected - requires token)
router.get('/verify', auth, authController.verifyToken);

// GET /api/auth/profile (Protected - requires token)
router.get('/profile', auth, authController.getProfile);

module.exports = router;
