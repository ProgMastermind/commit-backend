const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        enum: ['fitness', 'reading', 'learning', 'meditation', 'nutrition', 'productivity', 'creativity', 'social', 'finance', 'career', 'other'],
        default: 'other'
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['admin', 'member'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    privacy: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },
    inviteCode: {
        type: String,
        unique: true,
        required: true 
    },
    activeGoals: {
        type: Number,
        default: 0
    },
    completedGoals: {
        type: Number,
        default: 0
    },
    totalXP: {
        type: Number,
        default: 0
    },
    maxMembers: {
        type: Number,
        default: 10
    },
    image: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    goalCompletionPercentage: {
        type: Number,
        default: 0
    }
});

// Generate a random invite code for all groups
groupSchema.pre('save', function(next) {
    if (this.isNew && !this.inviteCode) {
        this.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    next();
});

module.exports = mongoose.model('Group', groupSchema);