const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Create a new group
router.post('/', groupController.createGroup);
router.post('/create', groupController.createGroup);

// Get user groups
router.get('/user-groups', groupController.getUserGroups);

// Get group by ID
router.get('/:groupId', groupController.getGroupById);

// Join a group
router.post('/join', groupController.joinGroup);
// Join a group by invite code
router.post('/join-by-code', groupController.joinGroupByCode);

// Leave a group
router.delete('/:groupId/leave', groupController.leaveGroup);

// Update group
router.put('/:groupId', groupController.updateGroup);

// Generate new invite code
router.post('/:groupId/invite-code', groupController.generateInviteCode);

module.exports = router;