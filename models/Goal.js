const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goalName: {
    type: String,
    required: true
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
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isGroupGoal: {
    type: Boolean,
    default: false
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  completedDate: {
    type: Date,
    default: null
  },
  xpReward: {
    type: Number,
    default: function() {
      // Base XP based on difficulty
      const baseXP = {
        easy: 50,
        medium: 100,
        hard: 200
      };
      return baseXP[this.difficulty] || 100;
    }
  },
  tokenReward: {
    type: Number,
    default: function() {
      // Base tokens based on difficulty
      const baseTokens = {
        easy: 5,
        medium: 10,
        hard: 20
      };
      return baseTokens[this.difficulty] || 10;
    }
  },
  memberCompletions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active'
    }
  }],
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Goal', goalSchema);