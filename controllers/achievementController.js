const Goal = require('../models/Goal');
const User = require('../models/user.model');
const Achievement = require('../models/Achievement');
const Group = require('../models/Group');

// Enhanced default achievements with more variety and visual appeal
const createDefaultAchievements = async (req, res) => {
    try {
        console.log('Creating default achievements...');
        
        // Default achievements with improved variety and visual appeal
        const defaultAchievements = [
            {
                title: 'First Steps',
                description: 'Create your first goal',
                icon: '👣',
                category: 'productivity',
                rarity: 'common',
                xpReward: 50,
                criteria: {
                    type: 'goal_count',
                    threshold: 1
                }
            },
            {
                title: 'Early Bird',
                description: 'Complete 5 morning goals before 8 AM',
                icon: '🌅',
                category: 'consistency',
                rarity: 'common',
                xpReward: 100,
                criteria: {
                    type: 'goal_count',
                    threshold: 5,
                    timeOfDay: 'morning'
                }
            },
            {
                title: 'Goal Getter',
                description: 'Complete 10 goals of any type',
                icon: '🎯',
                category: 'productivity',
                rarity: 'common',
                xpReward: 150,
                criteria: {
                    type: 'goal_count',
                    threshold: 10
                }
            },
            {
                title: 'Fitness Fanatic',
                description: 'Complete 15 fitness goals',
                icon: '💪',
                category: 'health',
                rarity: 'uncommon',
                xpReward: 200,
                criteria: {
                    type: 'goal_count',
                    threshold: 15,
                    category: 'fitness'
                }
            },
            {
                title: 'Bookworm',
                description: 'Complete 10 reading goals',
                icon: '📚',
                category: 'learning',
                rarity: 'uncommon',
                xpReward: 200,
                criteria: {
                    type: 'goal_count',
                    threshold: 10,
                    category: 'reading'
                }
            },
            {
                title: 'Streak Master',
                description: 'Maintain a 7-day streak',
                icon: '🔥',
                category: 'consistency',
                rarity: 'uncommon',
                xpReward: 250,
                criteria: {
                    type: 'streak_days',
                    threshold: 7
                }
            },
            {
                title: 'Social Butterfly',
                description: 'Join 3 different groups',
                icon: '🦋',
                category: 'social',
                rarity: 'uncommon',
                xpReward: 200,
                criteria: {
                    type: 'join_groups',
                    threshold: 3
                }
            },
            {
                title: 'Achievement Hunter',
                description: 'Unlock 5 other achievements',
                icon: '🏆',
                category: 'meta',
                rarity: 'rare',
                xpReward: 300,
                criteria: {
                    type: 'complete_achievements',
                    threshold: 5
                }
            },
            {
                title: 'Iron Will',
                description: 'Maintain a 30-day streak',
                icon: '⚙️',
                category: 'consistency',
                rarity: 'rare',
                xpReward: 500,
                criteria: {
                    type: 'streak_days',
                    threshold: 30
                }
            },
            {
                title: 'Centurion',
                description: 'Complete 100 goals of any type',
                icon: '🏅',
                category: 'productivity',
                rarity: 'legendary',
                xpReward: 1000,
                criteria: {
                    type: 'goal_count',
                    threshold: 100
                }
            }
        ];

        // Create achievements if they don't exist
        const createdAchievements = [];
        for (const achievement of defaultAchievements) {
            const createdAchievement = await Achievement.findOneAndUpdate(
                { title: achievement.title },
                achievement,
                { upsert: true, new: true }
            );
            createdAchievements.push(createdAchievement);
        }

        console.log(`Created/updated ${createdAchievements.length} achievements`);

        res.status(200).json({
            success: true,
            message: 'Default achievements created successfully',
            data: createdAchievements
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


// Get user achievements
const getUserAchievements = async (req, res) => {
    try {
        // Fix: Use req.userId instead of req.user.id
        const userId = req.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        // Find all achievements
        const allAchievements = await Achievement.find({});
        
        // Get user data for stats
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Initialize achievements array if it doesn't exist
        if (!user.achievements) {
            user.achievements = [];
            await user.save();
        }
        
        // Since there's no UserAchievement model, we'll use the achievements array in the User model
        const userAchievements = user.achievements || [];
        
        // Organize achievements into categories
        const unlocked = [];
        const inProgress = [];
        const locked = [];
        
        // Process each achievement
        allAchievements.forEach(achievement => {
            // Find user's progress for this achievement
            const userAchievement = userAchievements.find(a => 
                a.achievementId && a.achievementId.toString() === achievement._id.toString()
            );
            
            const achievementData = {
                _id: achievement._id,
                title: achievement.title,
                description: achievement.description,
                icon: achievement.icon,
                category: achievement.category,
                rarity: achievement.rarity,
                xpReward: achievement.xpReward,
                progress: userAchievement ? userAchievement.progress : 0
            };
            
            if (userAchievement && userAchievement.unlocked) {
                achievementData.unlockedAt = userAchievement.unlockedAt;
                unlocked.push(achievementData);
            } else if (userAchievement && userAchievement.progress > 0) {
                inProgress.push(achievementData);
            } else {
                locked.push(achievementData);
            }
        });
        
        // Calculate stats
        const stats = {
            total: allAchievements.length,
            unlocked: unlocked.length,
            inProgress: inProgress.length,
            locked: locked.length,
            completionRate: Math.round((unlocked.length / allAchievements.length) * 100)
        };
        
        res.status(200).json({
            success: true,
            message: 'User achievements retrieved successfully',
            data: {
                unlocked,
                inProgress,
                locked,
                stats
            }
        });
    } catch (error) {
        console.error('Error getting user achievements:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get achievement leaderboard
const getAchievementLeaderboard = async (req, res) => {
    try {
        // Find users with achievements and sort by achievement count and XP
        const users = await User.find({ 'achievements.unlocked': true })
            .select('username achievements totalXP')
            .sort({ 'achievements.length': -1, totalXP: -1 })
            .limit(10);
        
        const leaderboard = users.map(user => ({
            _id: user._id,
            username: user.username,
            achievementCount: user.achievements.filter(a => a.unlocked).length,
            totalXP: user.totalXP || 0
        }));
        
        res.status(200).json({
            success: true,
            message: 'Achievement leaderboard retrieved successfully',
            data: leaderboard
        });
    } catch (error) {
        console.error('Error getting achievement leaderboard:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get user achievements
// Add this to achievementController.js
const getAchievementProgress = async (req, res) => {
    try {
        // Fix: Use req.userId instead of req.userId
        const userId = req.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        const achievementId = req.params.id;
        
        // Get the achievement
        const achievement = await Achievement.findById(achievementId);
        if (!achievement) {
            return res.status(404).json({
                success: false,
                message: 'Achievement not found'
            });
        }
        
        // Get user data to check progress
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const userGoals = await Goal.find({ user: userId });
        const completedGoals = userGoals.filter(goal => goal.status === 'completed');
        
        // Calculate progress
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
                } else if (achievement.criteria.timeOfDay) {
                    const timeOfDayGoals = completedGoals.filter(goal => {
                        const completedTime = new Date(goal.completedAt);
                        const hours = completedTime.getHours();
                        
                        switch(achievement.criteria.timeOfDay) {
                            case 'morning':
                                return hours >= 5 && hours < 12;
                            case 'afternoon':
                                return hours >= 12 && hours < 17;
                            case 'evening':
                                return hours >= 17 && hours < 22;
                            case 'night':
                                return hours >= 22 || hours < 5;
                            default:
                                return false;
                        }
                    });
                    progress = Math.min(100, (timeOfDayGoals.length / achievement.criteria.threshold) * 100);
                    if (timeOfDayGoals.length >= achievement.criteria.threshold) {
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
                
            case 'group_goals':
                // Count completed group goals
                const userGroups = await Group.find({ members: userId });
                let groupGoalsCompleted = 0;
                
                for (const group of userGroups) {
                    const groupGoals = await Goal.find({ 
                        group: group._id,
                        status: 'completed'
                    });
                    groupGoalsCompleted += groupGoals.length;
                }
                
                progress = Math.min(100, (groupGoalsCompleted / achievement.criteria.threshold) * 100);
                if (groupGoalsCompleted >= achievement.criteria.threshold) {
                    unlockedAt = new Date();
                }
                break;
        }
        
        res.status(200).json({
            success: true,
            message: 'Achievement progress retrieved successfully',
            data: {
                achievement,
                progress: Math.round(progress),
                unlockedAt
            }
        });
    } catch (error) {
        console.error('Error getting achievement progress:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Check and award achievements
// Enhanced check and award achievements with more criteria types
const checkAndAwardAchievements = async (userId) => {
    try {
        console.log(`Checking achievements for user: ${userId}`);
        
        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found for achievement check');
            return { unlocked: false };
        }
        
        // Initialize user achievements array if it doesn't exist
        if (!user.achievements) {
            user.achievements = [];
        }
        
        const userGoals = await Goal.find({ user: userId });
        const completedGoals = userGoals.filter(goal => goal.status === 'completed');
        
        console.log(`User has ${completedGoals.length} completed goals`);
        
        // Get all achievements
        const allAchievements = await Achievement.find();
        
        // If no achievements exist, create default ones
        if (allAchievements.length === 0) {
            console.log('No achievements found, creating defaults...');
            
            // Create default achievements (simplified version)
            const defaultAchievements = [
                {
                    title: 'First Steps',
                    description: 'Create your first goal',
                    icon: '👣',
                    category: 'productivity',
                    rarity: 'common',
                    xpReward: 50,
                    criteria: {
                        type: 'goal_count',
                        threshold: 1
                    }
                },
                {
                    title: 'Goal Getter',
                    description: 'Complete 5 goals of any type',
                    icon: '🎯',
                    category: 'productivity',
                    rarity: 'common',
                    xpReward: 100,
                    criteria: {
                        type: 'goal_count',
                        threshold: 5
                    }
                }
            ];
            
            for (const achievement of defaultAchievements) {
                await Achievement.findOneAndUpdate(
                    { title: achievement.title },
                    achievement,
                    { upsert: true, new: true }
                );
            }
            
            // Fetch the newly created achievements
            const createdAchievements = await Achievement.find();
            console.log(`Created ${createdAchievements.length} default achievements`);
            
            // Use these for the rest of the function
            allAchievements = createdAchievements;
        }
        
        // Track newly unlocked achievements
        const newlyUnlocked = [];
        
        // Check each achievement
        for (const achievement of allAchievements) {
            // Find user's progress for this achievement
            let userAchievement = user.achievements.find(a => 
                a.achievementId && a.achievementId.toString() === achievement._id.toString()
            );
            
            // If user doesn't have this achievement in their array yet, add it
            if (!userAchievement) {
                userAchievement = {
                    achievementId: achievement._id,
                    progress: 0,
                    unlocked: false
                };
                user.achievements.push(userAchievement);
            }
            
            // Skip if already unlocked
            if (userAchievement.unlocked) {
                continue;
            }
            
            let progress = 0;
            let isUnlocked = false;
            
            switch(achievement.criteria.type) {
                case 'goal_count':
                    // Filter by category if specified
                    if (achievement.criteria.category) {
                        const categoryGoals = completedGoals.filter(
                            goal => goal.category === achievement.criteria.category
                        );
                        progress = categoryGoals.length;
                    } 
                    // Filter by time of day if specified
                    else if (achievement.criteria.timeOfDay) {
                        const timeOfDayGoals = completedGoals.filter(goal => {
                            if (!goal.completedDate) return false;
                            
                            const completedTime = new Date(goal.completedDate);
                            const hours = completedTime.getHours();
                            
                            switch(achievement.criteria.timeOfDay) {
                                case 'morning':
                                    return hours >= 5 && hours < 12;
                                case 'afternoon':
                                    return hours >= 12 && hours < 17;
                                case 'evening':
                                    return hours >= 17 && hours < 22;
                                case 'night':
                                    return hours >= 22 || hours < 5;
                                default:
                                    return false;
                            }
                        });
                        progress = timeOfDayGoals.length;
                    } 
                    // Count all completed goals
                    else {
                        progress = completedGoals.length;
                    }
                    break;
                    
                case 'streak_days':
                    progress = user.currentStreak || 0;
                    break;
                    
                case 'join_groups':
                    progress = user.stats && user.stats.groupsJoined ? user.stats.groupsJoined : 0;
                    break;
                    
                case 'complete_achievements':
                    progress = user.stats && user.stats.achievementsUnlocked ? user.stats.achievementsUnlocked : 0;
                    break;
                    
                default:
                    progress = 0;
            }
            
            // Update progress
            userAchievement.progress = progress;
            
            // Check if threshold is met
            isUnlocked = progress >= achievement.criteria.threshold;
            
            // If unlocked and not already awarded
            if (isUnlocked && !userAchievement.unlocked) {
                console.log(`Unlocking achievement: ${achievement.title}`);
                
                // Mark as unlocked
                userAchievement.unlocked = true;
                userAchievement.unlockedAt = new Date();
                
                // Add XP if method exists
                if (typeof user.addXP === 'function') {
                    await user.addXP(achievement.xpReward);
                } else {
                    // Fallback if method doesn't exist
                    user.totalXP = (user.totalXP || 0) + achievement.xpReward;
                }
                
                // Update achievement stats
                if (!user.stats) {
                    user.stats = {};
                }
                user.stats.achievementsUnlocked = (user.stats.achievementsUnlocked || 0) + 1;
                
                // Add to newly unlocked list
                newlyUnlocked.push({
                    _id: achievement._id,
                    title: achievement.title,
                    description: achievement.description,
                    icon: achievement.icon,
                    category: achievement.category,
                    rarity: achievement.rarity,
                    xpReward: achievement.xpReward
                });
            }
        }
        
        // Save user if any changes were made
        await user.save();
        
        if (newlyUnlocked.length > 0) {
            console.log(`Unlocked ${newlyUnlocked.length} new achievements`);
            return {
                unlocked: true,
                newAchievements: newlyUnlocked
            };
        }
        
        return { unlocked: false, newAchievements: [] };
        
    } catch (error) {
        console.error('Error checking achievements:', error);
        return { unlocked: false, error: error.message };
    }
};

// Check for new user achievements
const checkUserAchievements = async (req, res) => {
    try {
        console.log('Checking user achievements...');
        
        // Get user ID from authenticated request
        const userId = req.userId;
        console.log('User ID from request:', userId);
        
        if (!userId) {
            console.error('No user ID found in request');
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found:', userId);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        console.log('Found user:', user.email);
        
        // Check for new achievements
        const result = await checkAndAwardAchievements(userId);
        
        if (result.error) {
            console.error('Error checking achievements:', result.error);
            return res.status(500).json({
                success: false,
                message: 'Error checking achievements',
                error: result.error.message
            });
        }
        
        if (result.unlocked && result.newAchievements && result.newAchievements.length > 0) {
            console.log(`User unlocked ${result.newAchievements.length} new achievements`);
            
            return res.status(200).json({
                success: true,
                message: 'New achievements unlocked!',
                data: {
                    unlocked: true,
                    newAchievements: result.newAchievements
                }
            });
        }
        
        console.log('No new achievements unlocked');
        
        return res.status(200).json({
            success: true,
            message: 'No new achievements unlocked',
            data: {
                unlocked: false,
                newAchievements: []
            }
        });
    } catch (error) {
        console.error('Error checking user achievements:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    checkAndAwardAchievements,
    createDefaultAchievements,
    getAchievementLeaderboard,
    getAchievementProgress,
    getUserAchievements,
    checkUserAchievements
};