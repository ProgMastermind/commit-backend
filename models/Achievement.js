const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['consistency', 'streaks', 'reading', 'fitness', 'wellness', 'social', 'productivity', 'creativity', 'finance', 'meta'],
        required: true
    },
    rarity: {
        type: String,
        enum: ['common', 'uncommon', 'rare', 'legendary'],
        default: 'common'
    },
    xpReward: {
        type: Number,
        required: true
    },
    criteria: {
        type: {
            type: String,
            enum: ['goal_count', 'streak_days', 'category_count', 'join_groups', 'complete_achievements'],
            required: true
        },
        threshold: {
            type: Number,
            required: true
        },
        category: {
            type: String,
            default: null
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Achievement', achievementSchema);