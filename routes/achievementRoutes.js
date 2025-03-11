const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { authenticateToken } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get achievement leaderboard (this must come before /:id routes)
router.get('/leaderboard', achievementController.getAchievementLeaderboard);

// Check for new achievements
router.get('/check', achievementController.checkUserAchievements);

// Get user achievements
router.get('/', achievementController.getUserAchievements);

// Create default achievements (admin only)
router.post('/defaults', achievementController.createDefaultAchievements);

// Get progress for a specific achievement
router.get('/:id/progress', achievementController.getAchievementProgress);

module.exports = router;