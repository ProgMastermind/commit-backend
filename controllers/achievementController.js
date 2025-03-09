const Goal = require('../models/Goal');
const User = require('../models/user.model');
const Achievement = require('../models/Achievement');
const Group = require('../models/Group');

// Get user achievements
const getUserAchievements = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get all achievements
        const allAchievements = await Achievement.find();
        
        // Get user data to check progress
        const user = await User.findById(userId);
        const userGoals = await Goal.find({ user: userId });
        const completedGoals = userGoals.filter(goal => goal.status === 'completed');
        
        // Calculate user progress for each achievement
        const achievementsWithProgress = allAchievements.map(achievement => {
            let progress = 0;
            let unlockedAt = null;
            
            switch(achievement.criteria.type) {
                case 'goal_count':
                    // Count completed goals in specific category if provided
                    if (achievement.criteria.category) {
                        const categoryGoals = completedGoals.filter(
                            goal => goal.category === achievement.criteria.category
                        );
                        progress = Math.min(100, (categoryGoals.length / achievement.criteria.threshold) * 100);
                        if (categoryGoals.length >= achievement.criteria.threshold) {
                            unlockedAt = new Date();
                        }
                    } else {
                        // Count all completed goals
                        progress = Math.min(100, (completedGoals.length / achievement.criteria.threshold) * 100);
                        if (completedGoals.length >= achievement.criteria.threshold) {
                            unlockedAt = new Date();
                        }
                    }
                    break;
                    
                case 'streak_days':
                    progress = Math.min(100, (user.currentStreak / achievement.criteria.threshold) * 100);
                    if (user.currentStreak >= achievement.criteria.threshold) {
                        unlockedAt = new Date();
                    }
                    break;
                    
                case 'join_groups':
                    progress = Math.min(100, (user.stats.groupsJoined / achievement.criteria.threshold) * 100);
                    if (user.stats.groupsJoined >= achievement.criteria.threshold) {
                        unlockedAt = new Date();
                    }
                    break;
                    
                case 'complete_achievements':
                    progress = Math.min(100, (user.stats.achievementsUnlocked / achievement.criteria.threshold) * 100);
                    if (user.stats.achievementsUnlocked >= achievement.criteria.threshold) {
                        unlockedAt = new Date();
                    }
                    break;
            }
            
            return {
                ...achievement.toObject(),
                progress: Math.round(progress),
                unlockedAt
            };
        });
        
        // Separate unlocked and locked achievements
        const unlockedAchievements = achievementsWithProgress.filter(a => a.progress === 100);
        const inProgressAchievements = achievementsWithProgress.filter(a => a.progress > 0 && a.progress < 100);
        const lockedAchievements = achievementsWithProgress.filter(a => a.progress === 0);
        
        res.status(200).json({
            success: true,
            message: 'Achievements retrieved successfully',
            data: {
                all: achievementsWithProgress,
                unlocked: unlockedAchievements,
                inProgress: inProgressAchievements,
                locked: lockedAchievements,
                stats: {
                    total: achievementsWithProgress.length,
                    unlocked: unlockedAchievements.length,
                    inProgress: inProgressAchievements.length,
                    locked: lockedAchievements.length,
                    completionRate: Math.round((unlockedAchievements.length / achievementsWithProgress.length) * 100)
                }
            }
        });
    } catch (error) {
        console.error('Error getting achievements:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Check and award achievements
const checkAndAwardAchievements = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;
        
        const userGoals = await Goal.find({ user: userId });
        const completedGoals = userGoals.filter(goal => goal.status === 'completed');
        
        // Get all achievements
        const allAchievements = await Achievement.find();
        
        // Check each achievement
        for (const achievement of allAchievements) {
            let isUnlocked = false;
            
            switch(achievement.criteria.type) {
                case 'goal_count':
                    if (achievement.criteria.category) {
                        const categoryGoals = completedGoals.filter(
                            goal => goal.category === achievement.criteria.category
                        );
                        isUnlocked = categoryGoals.length >= achievement.criteria.threshold;
                    } else {
                        isUnlocked = completedGoals.length >= achievement.criteria.threshold;
                    }
                    break;
                    
                case 'streak_days':
                    isUnlocked = user.currentStreak >= achievement.criteria.threshold;
                    break;
                    
                case 'join_groups':
                    isUnlocked = user.stats.groupsJoined >= achievement.criteria.threshold;
                    break;
                    
                case 'complete_achievements':
                    isUnlocked = user.stats.achievementsUnlocked >= achievement.criteria.threshold;
                    break;
            }
            
            // Check if user already has this badge
            const alreadyHasBadge = user.badges.some(badge => badge.name === achievement.title);
            
            // If unlocked and not already awarded
            if (isUnlocked && !alreadyHasBadge) {
                // Add badge to user
                user.badges.push({
                    name: achievement.title,
                    icon: achievement.icon,
                    description: achievement.description,
                    earnedAt: new Date()
                });
                
                // Add XP
                await user.addXP(achievement.xpReward);
                
                // Update achievement stats
                user.stats.achievementsUnlocked += 1;
                
                // Save user
                await user.save();
                
                // Return info about newly unlocked achievement
                return {
                    unlocked: true,
                    achievement: achievement,
                    xpEarned: achievement.xpReward
                };
            }
        }
        
        return { unlocked: false };
        
    } catch (error) {
        console.error('Error checking achievements:', error);
        return { unlocked: false, error };
    }
};

// Create default achievements (admin only)
const createDefaultAchievements = async (req, res) => {
    try {
        // Check if user is admin (you'll need to implement admin role check)
        
        // Default achievements
        const defaultAchievements = [
            {
                title: 'Early Bird',
                description: 'Complete 5 morning goals before 8 AM',
                icon: '🌅',
                category: 'consistency',
                rarity: 'common',
                xpReward: 100,
                criteria: {
                    type: 'goal_count',
                    threshold: 5
                }
            },
            {
                title: 'Streak Master',
                description: 'Maintain a 7-day streak',
                icon: '🔥',
                category: 'streaks',
                rarity: 'common',
                xpReward: 150,
                criteria: {
                    type: 'streak_days',
                    threshold: 7
                }
            },
            {
                title: 'Knowledge Seeker',
                description: 'Read 10 books',
                icon: '📚',
                category: 'reading',
                rarity: 'uncommon',
                xpReward: 250,
                criteria: {
                    type: 'goal_count',
                    threshold: 10,
                    category: 'reading'
                }
            },
            {
                title: 'Fitness Enthusiast',
                description: 'Complete 20 workout sessions',
                icon: '💪',
                category: 'fitness',
                rarity: 'uncommon',
                xpReward: 300,
                criteria: {
                    type: 'goal_count',
                    threshold: 20,
                    category: 'fitness'
                }
            },
            {
                title: 'Social Butterfly',
                description: 'Join 3 different accountability groups',
                icon: '🦋',
                category: 'social',
                rarity: 'uncommon',
                xpReward: 200,
                criteria: {
                    type: 'join_groups',
                    threshold: 3
                }
            }
        ];
        
        // Insert achievements
        await Achievement.insertMany(defaultAchievements);
        
        res.status(201).json({
            success: true,
            message: 'Default achievements created successfully',
            data: defaultAchievements
        });
    } catch (error) {
        console.error('Error creating default achievements:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    getUserAchievements,
    checkAndAwardAchievements,
    createDefaultAchievements
};