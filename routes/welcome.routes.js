const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');

// Public welcome route
router.get('/welcome', (req, res) => {
    res.json({ message: 'Welcome to the API!' });
});

// Protected welcome route (requires authentication)
router.get('/welcome/protected', authenticateToken, (req, res) => {
    res.json({ 
        message: 'Welcome to the protected route!',
        userId: req.userId 
    });
});

module.exports = router;