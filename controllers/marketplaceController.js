const MarketplaceItem = require('../models/MarketplaceItem');

// Create a new marketplace item
const createMarketplaceItem = async (req, res) => {
    try {
        const { name, category, tokenCost, description } = req.body;
        const userId = req.userId; // From auth middleware

        // Validate required fields
        if (!name || !category || !tokenCost) {
            return res.status(400).json({
                success: false,
                message: "Name, category, and token cost are required"
            });
        }

        // Validate token cost is positive
        if (tokenCost <= 0) {
            return res.status(400).json({
                success: false,
                message: "Token cost must be greater than 0"
            });
        }

        const newItem = new MarketplaceItem({
            name,
            category,
            tokenCost,
            description,
            createdBy: userId
        });

        await newItem.save();

        res.status(201).json({
            success: true,
            message: "Marketplace item created successfully",
            data: newItem
        });

    } catch (error) {
        console.error('Error in createMarketplaceItem:', error);
        res.status(500).json({
            success: false,
            message: "Error creating marketplace item",
            error: error.message
        });
    }
};

// Get all marketplace items
const getMarketplaceItems = async (req, res) => {
    try {
        const { category } = req.query;
        
        // Build query based on filters
        const query = { isAvailable: true };
        if (category) {
            query.category = category;
        }

        const items = await MarketplaceItem.find(query)
            .populate('createdBy', 'email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: items
        });

    } catch (error) {
        console.error('Error in getMarketplaceItems:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching marketplace items",
            error: error.message
        });
    }
};

// Get specific marketplace item
const getMarketplaceItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        const item = await MarketplaceItem.findById(itemId)
            .populate('createdBy', 'email');

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Marketplace item not found"
            });
        }

        res.status(200).json({
            success: true,
            data: item
        });

    } catch (error) {
        console.error('Error in getMarketplaceItem:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching marketplace item",
            error: error.message
        });
    }
};

// Update marketplace item
const updateMarketplaceItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.userId;
        const updates = req.body;

        const item = await MarketplaceItem.findById(itemId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Marketplace item not found"
            });
        }

        // Verify ownership
        if (item.createdBy.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this item"
            });
        }

        // Update the item
        Object.assign(item, updates);
        await item.save();

        res.status(200).json({
            success: true,
            message: "Marketplace item updated successfully",
            data: item
        });

    } catch (error) {
        console.error('Error in updateMarketplaceItem:', error);
        res.status(500).json({
            success: false,
            message: "Error updating marketplace item",
            error: error.message
        });
    }
};

module.exports = {
    createMarketplaceItem,
    getMarketplaceItems,
    getMarketplaceItem,
    updateMarketplaceItem
}; 