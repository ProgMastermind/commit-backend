const Goal = require('../models/Goal');
const User = require('../models/user.model');
const Group = require('../models/Group'); 

const createGoal = async (req, res) => {
  try {
    const { gameName, goalName, deadline, isGroupGoal, groupId } = req.body;
    const userId = req.userId; // Assuming you have auth middleware that sets req.user
    console.log('userId:', userId);

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If it's a group goal, verify group exists and user is a member
    if (isGroupGoal && groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      const isMember = group.members.some(member => 
        member.user.toString() === userId.toString()
      );
      
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }
    }

    // Create new goal
    const newGoal = new Goal({
      user: userId,
      gameName,
      goalName,
      deadline: new Date(deadline),
      isGroupGoal,
      groupId: isGroupGoal ? groupId : null
    });

    // Save goal to database
    await newGoal.save();

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: newGoal
    });

  } catch (error) {
    console.error('Error in createGoal:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Add this function to your existing controller
const getGoals = async (req, res) => {
    try {
        const userId = req.userId;

        // Fetch all goals for the user
        const goals = await Goal.find({ user: userId })
            .sort({ createdAt: -1 }); // Sort by newest first

        // Optional: Group goals by status
        const activeGoals = goals.filter(goal => goal.status === 'active');
        const completedGoals = goals.filter(goal => goal.status === 'completed');

        res.status(200).json({
            success: true,
            message: 'Goals retrieved successfully',
            data: {
                all: goals,
                active: activeGoals,
                completed: completedGoals,
                totalGoals: goals.length,
                activeCount: activeGoals.length,
                completedCount: completedGoals.length
            }
        });

    } catch (error) {
        console.error('Error in getGoals:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const markGoalComplete = async (req, res) => {
    try {
        const { goalId } = req.params;
        const userId = req.userId;

        // Find the goal
        const goal = await Goal.findById(goalId);

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: "Goal not found"
            });
        }

        // Verify the user owns this goal
        if (goal.user.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to complete this goal"
            });
        }

        // Check if goal is already completed
        if (goal.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: "Goal is already completed"
            });
        }

        // Start a transaction
        const session = await Goal.startSession();
        session.startTransaction();

        try {
            // Update goal status and completion date
            goal.status = 'completed';
            goal.completedDate = new Date();
            await goal.save({ session });

            // Find user and update tokens
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Add 10 tokens to user's balance
            const REWARD_TOKENS = 10;
            user.tokens = (user.tokens || 0) + REWARD_TOKENS;
            await user.save({ session });

            // Commit the transaction
            await session.commitTransaction();

            res.status(200).json({
                success: true,
                message: `Goal marked as completed. You earned ${REWARD_TOKENS} tokens!`,
                data: {
                    goal,
                    tokensEarned: REWARD_TOKENS,
                    newTokenBalance: user.tokens
                }
            });

        } catch (error) {
            // If anything fails, abort the transaction
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('Error in markGoalComplete:', error);
        res.status(500).json({
            success: false,
            message: "Error completing goal",
            error: error.message
        });
    }
};

module.exports = {
  createGoal,
  getGoals,
  markGoalComplete
};