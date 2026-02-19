// backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

// Apply authentication middleware to all admin routes
router.use(auth);
router.use(auth.isAdmin); // Ensure user is admin

// ============ PLAYER ROUTES ============
router.get('/players', adminController.getAllPlayers);
router.post('/players', adminController.addPlayer);
router.put('/players/:id/stats', adminController.updatePlayerStats);
router.delete('/players/:id', adminController.deletePlayer);
router.get('/players/top-performers', adminController.getTopPerformers);

// ============ MATCH ROUTES ============
router.get('/matches', adminController.getAllMatches);
router.get('/matches/upcoming', adminController.getUpcomingMatches);
router.get('/matches/completed', adminController.getCompletedMatches);
router.post('/matches', adminController.addMatch);
router.put('/matches/:id/result', adminController.updateMatchResult);
router.delete('/matches/:id', adminController.deleteMatch);

// ============ NEWS ROUTES ============
router.get('/news', adminController.getAllNews);
router.post('/news', adminController.addNews);
router.put('/news/:id', adminController.updateNews);
router.delete('/news/:id', adminController.deleteNews);

// ============ BOOKING ROUTES ============
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/stats', adminController.getBookingStats);
router.get('/bookings/revenue-by-match', adminController.getRevenueByMatch);

// ============ REVENUE ROUTES ============
router.get('/revenue/summary', adminController.getRevenueSummary);
router.get('/revenue/monthly', adminController.getMonthlyRevenue);
router.post('/revenue', adminController.addRevenue);

// ============ SETTINGS ROUTES ============
router.get('/settings', adminController.getAllSettings);
router.get('/settings/ticket-prices', adminController.getTicketPrices);
router.put('/settings/ticket-prices', adminController.updateTicketPrices);
router.put('/settings/membership-fee', adminController.updateMembershipFee);

// ============ DASHBOARD ROUTES ============
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;