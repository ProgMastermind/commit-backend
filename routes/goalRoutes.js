const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticateToken } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Create a new goal
router.post('/', goalController.createGoal);

// Get user goals
router.get('/user-goals', goalController.getGoals);

// Get group goals
router.get('/group/:groupId', goalController.getGroupGoals);

// Mark goal as complete
router.put('/:goalId/complete', goalController.markGoalComplete);

// Update goal progress
router.put('/:goalId/progress', goalController.updateGoalProgress);

// Delete a goal
router.delete('/:goalId', goalController.deleteGoal);

module.exports = router;