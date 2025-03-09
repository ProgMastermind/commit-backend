const mongoose = require('mongoose');

const marketplaceItemSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        enum: ['movies', 'groceries', 'food', 'other'],
        required: true
    },
    tokenCost: { 
        type: Number, 
        required: true 
    },
    description: { 
        type: String 
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('MarketplaceItem', marketplaceItemSchema); 