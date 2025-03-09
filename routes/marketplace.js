const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware'); // Your auth middleware
const {
    createMarketplaceItem,
    getMarketplaceItems,
    getMarketplaceItem,
    updateMarketplaceItem
} = require('../controllers/marketplaceController');

// Create new marketplace item
router.post('/create', authenticateToken, createMarketplaceItem);

// Get all marketplace items
router.get('/getitems', getMarketplaceItems);

// Get specific marketplace item
router.get('/:itemId', getMarketplaceItem);

// Update marketplace item
router.put('/:itemId', authenticateToken, updateMarketplaceItem);

module.exports = router; 