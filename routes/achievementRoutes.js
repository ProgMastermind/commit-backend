const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { authenticateToken } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get user achievements
router.get('/', achievementController.getUserAchievements);

// Create default achievements (admin only)
router.post('/defaults', achievementController.createDefaultAchievements);

module.exports = router;