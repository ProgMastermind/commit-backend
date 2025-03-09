const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        trim: true,
        default: function() {
            return this.email.split('@')[0];
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        default: ''
    },
    level: {
        type: Number,
        default: 1
    },
    totalXP: {
        type: Number,
        default: 0
    },
    tokens: {
        type: Number,
        default: 0
    },
    currentStreak: {
        type: Number,
        default: 0
    },
    longestStreak: {
        type: Number,
        default: 0
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    stats: {
        goalsCompleted: {
            type: Number,
            default: 0
        },
        goalsCreated: {
            type: Number,
            default: 0
        },
        achievementsUnlocked: {
            type: Number,
            default: 0
        },
        totalAchievements: {
            type: Number,
            default: 0
        },
        groupsJoined: {
            type: Number,
            default: 0
        },
        averageCompletionRate: {
            type: Number,
            default: 0
        }
    },
    activity: [{
        date: {
            type: Date,
            required: true
        },
        count: {
            type: Number,
            default: 0
        }
    }],
    badges: [{
        name: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        earnedAt: {
            type: Date,
            default: Date.now
        }
    }],
    topCategories: [{
        name: {
            type: String,
            required: true
        },
        percentage: {
            type: Number,
            required: true
        },
        color: {
            type: String,
            default: "from-blue-500 to-cyan-500"
        }
    }],
    settings: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        pushNotifications: {
            type: Boolean,
            default: true
        },
        theme: {
            type: String,
            enum: ['dark', 'light'],
            default: 'dark'
        }
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

// Method to update streak
userSchema.methods.updateStreak = async function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // If user was active today, just update lastActive
    if (this.lastActive >= today) {
        return;
    }
    
    // If user was active yesterday, increment streak
    if (this.lastActive >= yesterday) {
        this.currentStreak += 1;
        if (this.currentStreak > this.longestStreak) {
            this.longestStreak = this.currentStreak;
        }
    } else {
        // Reset streak if user missed a day
        this.currentStreak = 1;
    }
    
    this.lastActive = new Date();
    await this.save();
};

// Method to add XP and level up if needed
userSchema.methods.addXP = async function(amount) {
    this.totalXP += amount;
    
    // Calculate new level (1000 XP per level)
    const newLevel = Math.floor(this.totalXP / 1000) + 1;
    
    // If leveled up
    if (newLevel > this.level) {
        this.level = newLevel;
    }
    
    await this.save();
    return {
        newTotalXP: this.totalXP,
        newLevel: this.level,
        leveledUp: newLevel > this.level
    };
};

// Method to record daily activity
userSchema.methods.recordActivity = async function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if we already have an entry for today
    const todayActivityIndex = this.activity.findIndex(
        a => new Date(a.date).setHours(0, 0, 0, 0) === today.getTime()
    );
    
    if (todayActivityIndex >= 0) {
        // Increment existing activity
        this.activity[todayActivityIndex].count += 1;
    } else {
        // Add new activity entry
        this.activity.push({
            date: today,
            count: 1
        });
    }
    
    // Keep only the last 30 days of activity
    if (this.activity.length > 30) {
        this.activity.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.activity = this.activity.slice(0, 30);
    }
    
    await this.save();
};

module.exports = mongoose.model('User', userSchema);