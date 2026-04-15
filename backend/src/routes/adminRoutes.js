// Admin routes
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const galleryController = require('../controllers/galleryController');
const commentsController = require('../controllers/commentsController');
const pollsController = require('../controllers/pollsController');
const auth = require('../middleware/auth');
const reportsController = require('../controllers/reportsController');
const upload = require('../middleware/upload');

// Apply authentication middleware to all admin routes
router.use(auth);
router.use(auth.isAdmin);

// Player routes
router.get('/players', auth.requireRole(['super_admin', 'admin']), adminController.getAllPlayers);
router.post('/players', auth.requireRole(['super_admin', 'admin']), adminController.addPlayer);
router.put('/players/:id/stats', auth.requireRole(['super_admin', 'admin']), adminController.updatePlayerStats);
router.delete('/players/:id', auth.requireRole(['super_admin', 'admin']), adminController.deletePlayer);
router.get('/players/top-performers', auth.requireRole(['super_admin', 'admin']), adminController.getTopPerformers);

// Match routes
router.get('/matches', auth.requireRole(['super_admin', 'admin']), adminController.getAllMatches);
router.get('/matches/upcoming', auth.requireRole(['super_admin', 'admin']), adminController.getUpcomingMatches);
router.get('/matches/completed', auth.requireRole(['super_admin', 'admin']), adminController.getCompletedMatches);
router.post('/matches', auth.requireRole(['super_admin', 'admin']), adminController.addMatch);
router.put('/matches/:id/result', auth.requireRole(['super_admin', 'admin']), adminController.updateMatchResult);
router.delete('/matches/:id', auth.requireRole(['super_admin', 'admin']), adminController.deleteMatch);

// News routes
router.get('/news', adminController.getAllNews);
router.post('/news', adminController.addNews);
router.put('/news/:id', adminController.updateNews);
router.delete('/news/:id', auth.requireRole(['super_admin', 'admin']), adminController.deleteNews);

// Booking routes
router.get('/bookings', auth.requireRole(['super_admin', 'admin']), adminController.getAllBookings);
router.get('/bookings/stats', auth.requireRole(['super_admin', 'admin']), adminController.getBookingStats);
router.get('/bookings/revenue-by-match', auth.requireRole(['super_admin', 'admin']), adminController.getRevenueByMatch);

// Revenue routes
router.get('/revenue/summary', auth.requireRole(['super_admin', 'admin']), adminController.getRevenueSummary);
router.get('/revenue/monthly', auth.requireRole(['super_admin', 'admin']), adminController.getMonthlyRevenue);
router.post('/revenue', auth.requireRole(['super_admin', 'admin']), adminController.addRevenue);

// Settings routes
router.get('/settings', auth.requireRole(['super_admin', 'admin']), adminController.getAllSettings);
router.get('/settings/ticket-prices', auth.requireRole(['super_admin', 'admin']), adminController.getTicketPrices);
router.put('/settings/ticket-prices', auth.requireRole(['super_admin', 'admin']), adminController.updateTicketPrices);
router.put('/settings/membership-fee', auth.requireRole(['super_admin', 'admin']), adminController.updateMembershipFee);

// Dashboard routes
router.get('/dashboard/stats', auth.requireRole(['super_admin', 'admin']), adminController.getDashboardStats);

// Report routes
router.get('/reports/player-performance', auth.requireRole(['super_admin', 'admin']), reportsController.getPlayerPerformanceReport);
router.get('/reports/squad-overview', auth.requireRole(['super_admin', 'admin']), reportsController.getSquadOverviewReport);
router.get('/reports/top-scorers', auth.requireRole(['super_admin', 'admin']), reportsController.getTopScorersReport);
router.get('/reports/match-performance', auth.requireRole(['super_admin', 'admin']), reportsController.getMatchPerformanceReport);
router.get('/reports/fixtures', auth.requireRole(['super_admin', 'admin']), reportsController.getFixturesReport);
router.get('/reports/season-performance', auth.requireRole(['super_admin', 'admin']), reportsController.getSeasonPerformanceReport);
router.get('/reports/tickets', auth.requireRole(['super_admin', 'admin']), reportsController.getTicketSalesReport);
router.get('/reports/revenue', auth.requireRole(['super_admin', 'admin']), reportsController.getRevenueReport);
router.get('/reports/match-day-revenue', auth.requireRole(['super_admin', 'admin']), reportsController.getMatchDayRevenueReport);
router.get('/reports/membership', auth.requireRole(['super_admin', 'admin']), reportsController.getMembershipReport);
router.get('/reports/expiring-memberships', auth.requireRole(['super_admin', 'admin']), reportsController.getExpiringMembershipsReport);
router.get('/reports/polls', auth.requireRole(['super_admin', 'admin']), reportsController.getPollResultsReport);
router.get('/reports/attendance', auth.requireRole(['super_admin', 'admin']), reportsController.getAttendanceReport);
router.get('/reports/executive-dashboard', auth.requireRole(['super_admin', 'admin']), reportsController.getExecutiveDashboardReport);
router.get('/reports/export', auth.requireRole(['super_admin', 'admin']), reportsController.exportReportCSV);

// Gallery routes
router.get('/gallery', galleryController.getAll);
router.post('/gallery', auth.requireRole(['super_admin', 'admin']), galleryController.create);
router.post('/gallery/upload', auth.requireRole(['super_admin', 'admin']), (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('[Gallery Upload] Multer error:', err.message);
      return res.status(400).json({ success: false, message: err.message || 'File upload error' });
    }
    // Log what we received for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Gallery Upload] Received request:');
      console.log('[Gallery Upload]   - req.file:', req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      } : 'NULL');
      console.log('[Gallery Upload]   - req.body:', req.body);
    }
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided. Please ensure the image is properly attached to the form data.' 
      });
    }
    next();
  });
}, galleryController.uploadImage);
router.delete('/gallery/:id', auth.requireRole(['super_admin', 'admin']), galleryController.deleteGallery);

// Comment moderation routes
router.get('/comments', commentsController.getAllAdmin);
router.delete('/comments/:id', auth.requireRole(['super_admin', 'admin']), commentsController.deleteComment);
router.put('/comments/:id/approve', auth.requireRole(['super_admin', 'admin']), commentsController.toggleApproval);

// Poll routes
router.get('/polls', auth.requireRole(['super_admin', 'admin']), pollsController.getAllPolls);
router.post('/polls', auth.requireRole(['super_admin', 'admin']), pollsController.createPoll);
router.delete('/polls/:id', auth.requireRole(['super_admin', 'admin']), pollsController.deletePoll);
router.put('/polls/:id/deactivate', auth.requireRole(['super_admin', 'admin']), pollsController.deactivatePoll);

// Admin management (super_admin only)
router.get('/admins', auth.requireRole(['super_admin']), adminController.getAllAdmins);
router.post('/admins', auth.requireRole(['super_admin']), adminController.createAdmin);
router.delete('/admins/:id', auth.requireRole(['super_admin']), adminController.deleteAdmin);

module.exports = router;