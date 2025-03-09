const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
    getPersonalAchievements, 
    getGroupAchievements, 
    getAchievementStats 
} = require('../controllers/achievementController');

// Achievement routes
router.get('/personal', authenticateToken, getPersonalAchievements);
router.get('/group', authenticateToken, getGroupAchievements);
router.get('/stats', authenticateToken, getAchievementStats);

module.exports = router;