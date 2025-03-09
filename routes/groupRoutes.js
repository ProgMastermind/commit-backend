const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const validateGroup = require('../middleware/validateGroup');
const {
    createGroup,
    getUserGroups,
    addMemberByEmail,
    getGroupDetails
} = require('../controllers/groupController');

// Group routes
router.post('/create', authenticateToken, validateGroup, createGroup);
router.get('/user-groups', authenticateToken, getUserGroups);
router.post('/add-member', authenticateToken, addMemberByEmail);
router.get('/getgroupdetails', authenticateToken, getGroupDetails)

module.exports = router;