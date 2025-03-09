const Goal = require('../models/Goal');
const User = require('../models/user.model');

// Get Personal Achievements
const getPersonalAchievements = async (req, res) => {
    try {
        const userId = req.userId;

        const personalAchievements = await Goal.find({
            user: userId,
            status: 'completed',
            isGroupGoal: false
        }).sort({ completedDate: -1 });

        res.status(200).json({
            success: true,
            message: 'Personal achievements retrieved successfully',
            data: {
                achievements: personalAchievements,
                count: personalAchievements.length
            }
        });

    } catch (error) {
        console.error('Error in getPersonalAchievements:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get Group Achievements
const getGroupAchievements = async (req, res) => {
    try {
        const userId = req.userId;

        const groupAchievements = await Goal.find({
            user: userId,
            status: 'completed',
            isGroupGoal: true
        })
        .sort({ completedDate: -1 })
        .populate('groupId', 'name'); // Assuming your Group model has a 'name' field

        res.status(200).json({
            success: true,
            message: 'Group achievements retrieved successfully',
            data: {
                achievements: groupAchievements,
                count: groupAchievements.length
            }
        });

    } catch (error) {
        console.error('Error in getGroupAchievements:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get Achievement Stats
const getAchievementStats = async (req, res) => {
    try {
        const userId = req.userId;

        // Get all completed goals
        const allAchievements = await Goal.find({
            user: userId,
            status: 'completed'
        });

        // Separate personal and group achievements
        const personalAchievements = allAchievements.filter(achievement => !achievement.isGroupGoal);
        const groupAchievements = allAchievements.filter(achievement => achievement.isGroupGoal);

        // Calculate completion rates
        const totalGoals = await Goal.countDocuments({ user: userId });
        const completionRate = totalGoals > 0 
            ? ((allAchievements.length / totalGoals) * 100).toFixed(2) 
            : 0;

        // Calculate streaks
        const user = await User.findById(userId);
        
        // Calculate achievements by game
        const achievementsByGame = await Goal.aggregate([
            {
                $match: {
                    user: userId,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$gameName',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: 'Achievement statistics retrieved successfully',
            data: {
                totalAchievements: allAchievements.length,
                personalAchievements: {
                    count: personalAchievements.length,
                    percentage: totalGoals > 0 
                        ? ((personalAchievements.length / totalGoals) * 100).toFixed(2) 
                        : 0
                },
                groupAchievements: {
                    count: groupAchievements.length,
                    percentage: totalGoals > 0 
                        ? ((groupAchievements.length / totalGoals) * 100).toFixed(2) 
                        : 0
                },
                overallCompletionRate: completionRate,
                currentStreak: user.currentStreak,
                longestStreak: user.longestStreak,
                achievementsByGame,
                recentAchievements: allAchievements
                    .sort((a, b) => b.completedDate - a.completedDate)
                    .slice(0, 5)
            }
        });

    } catch (error) {
        console.error('Error in getAchievementStats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    getPersonalAchievements,
    getGroupAchievements,
    getAchievementStats
};