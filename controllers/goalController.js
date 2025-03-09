const Goal = require('../models/Goal');
const User = require('../models/user.model');
const Group = require('../models/Group'); 

const createGoal = async (req, res) => {
  try {
    const { goalName, description, category, difficulty, deadline, isGroupGoal, groupId } = req.body;
    const userId = req.userId; // Assuming you have auth middleware that sets req.userId

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If it's a group goal, verify group exists and user is a member
    let group = null;
    let memberIds = [];
    
    if (isGroupGoal && groupId) {
      group = await Group.findById(groupId);
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

      // Get all member IDs for the group
      memberIds = group.members.map(member => member.user);

      // Update group's active goals count
      group.activeGoals += 1;
      await group.save();
    }

    // Create new goal
    const newGoal = new Goal({
      user: userId, // This is the creator of the goal
      goalName,
      description: description || '',
      category: category || 'other',
      difficulty: difficulty || 'medium',
      deadline: new Date(deadline),
      isGroupGoal,
      groupId: isGroupGoal ? groupId : null
    });

    // If it's a group goal, initialize member completions for all group members
    if (isGroupGoal && memberIds.length > 0) {
      newGoal.memberCompletions = memberIds.map(memberId => ({
        user: memberId,
        status: 'active',
        completedDate: null
      }));
      
      // Initialize completion percentage to 0
      newGoal.completionPercentage = 0;
    }

    // Save goal to database
    await newGoal.save();

    // Update user stats
    if (!user.stats) {
      user.stats = {};
    }
    user.stats.goalsCreated = (user.stats.goalsCreated || 0) + 1;
    await user.save();

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

const getGoals = async (req, res) => {
    try {
        const userId = req.userId;

        // Fetch personal goals for the user
        const personalGoals = await Goal.find({ 
            user: userId,
            isGroupGoal: false
        }).sort({ createdAt: -1 });

        // Fetch group goals where user is a member of the group
        const userGroups = await Group.find({ 'members.user': userId }, '_id');
        const groupIds = userGroups.map(group => group._id);
        
        const groupGoals = await Goal.find({
            isGroupGoal: true,
            groupId: { $in: groupIds }
        })
        .populate('groupId', 'name')
        .sort({ createdAt: -1 });

        // Combine personal and group goals
        const allGoals = [...personalGoals, ...groupGoals];

        // For group goals, add member completion status
        const enhancedGroupGoals = groupGoals.map(goal => {
            const goalObj = goal.toObject();
            
            // Find this user's completion status
            const memberCompletion = goal.memberCompletions?.find(
                completion => completion.user.toString() === userId
            );
            
            // Add user-specific completion status
            goalObj.userCompleted = memberCompletion?.status === 'completed';
            
            return goalObj;
        });

        // Replace group goals with enhanced versions
        const enhancedAllGoals = allGoals.map(goal => {
            if (goal.isGroupGoal) {
                return enhancedGroupGoals.find(g => g._id.toString() === goal._id.toString());
            }
            return goal;
        });

        // Optional: Group goals by status
        const activeGoals = enhancedAllGoals.filter(goal => {
            if (goal.isGroupGoal) {
                const memberCompletion = goal.memberCompletions?.find(
                    completion => completion.user.toString() === userId
                );
                return memberCompletion?.status === 'active';
            }
            return goal.status === 'active';
        });
        
        const completedGoals = enhancedAllGoals.filter(goal => {
            if (goal.isGroupGoal) {
                const memberCompletion = goal.memberCompletions?.find(
                    completion => completion.user.toString() === userId
                );
                return memberCompletion?.status === 'completed';
            }
            return goal.status === 'completed';
        });
        
        const failedGoals = enhancedAllGoals.filter(goal => !goal.isGroupGoal && goal.status === 'failed');

        res.status(200).json({
            success: true,
            message: 'Goals retrieved successfully',
            data: {
                all: enhancedAllGoals,
                active: activeGoals,
                completed: completedGoals,
                failed: failedGoals,
                totalGoals: enhancedAllGoals.length,
                activeCount: activeGoals.length,
                completedCount: completedGoals.length,
                failedCount: failedGoals.length
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

        // Handle completion differently based on whether it's a personal or group goal
        if (!goal.isGroupGoal) {
            // For personal goals, verify the user owns this goal
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
                goal.progress = 100;
                await goal.save({ session });

                // Find user and update stats
                const user = await User.findById(userId);
                if (!user) {
                    throw new Error('User not found');
                }

                // Add tokens to user's balance
                user.tokens = (user.tokens || 0) + goal.tokenReward;
                
                // Initialize stats if not exists
                if (!user.stats) {
                    user.stats = {};
                }
                
                // Update user stats
                user.stats.goalsCompleted = (user.stats.goalsCompleted || 0) + 1;
                
                // Check if methods exist before calling them
                if (typeof user.addXP === 'function') {
                    await user.addXP(goal.xpReward);
                } else {
                    // Fallback if method doesn't exist
                    user.xp = (user.xp || 0) + goal.xpReward;
                }
                
                if (typeof user.updateStreak === 'function') {
                    await user.updateStreak();
                }
                
                if (typeof user.recordActivity === 'function') {
                    await user.recordActivity();
                }
                
                await user.save({ session });

                // If it's a group goal, update group stats
                if (goal.isGroupGoal && goal.groupId) {
                    const group = await Group.findById(goal.groupId);
                    if (group) {
                        group.completedGoals += 1;
                        group.activeGoals -= 1;
                        await group.save({ session });
                    }
                }

                await session.commitTransaction();
                session.endSession();

                res.status(200).json({
                    success: true,
                    message: "Goal marked as complete",
                    data: goal
                });
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw error;
            }
        } else {
            // For group goals, verify the user is a member of the group
            const group = await Group.findById(goal.groupId);
            if (!group) {
                return res.status(404).json({
                    success: false,
                    message: "Group not found"
                });
            }
            
            const isMember = group.members.some(member => 
                member.user.toString() === userId
            );
            
            if (!isMember) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to complete this goal"
                });
            }

            // Find the user's completion record in memberCompletions
            const memberCompletionIndex = goal.memberCompletions.findIndex(
                completion => completion.user && completion.user.toString() === userId
            );
            
            if (memberCompletionIndex === -1) {
                // If user is not in memberCompletions, add them
                goal.memberCompletions.push({
                    user: userId,
                    status: 'active',
                    completedDate: null
                });
                
                // Save the updated goal with the new member
                await goal.save();
                
                // Refetch the goal to get the updated memberCompletions array
                const updatedGoal = await Goal.findById(goalId);
                if (!updatedGoal) {
                    return res.status(404).json({
                        success: false,
                        message: "Goal not found after update"
                    });
                }
                
                // Find the index again with the updated goal
                const updatedMemberCompletionIndex = updatedGoal.memberCompletions.findIndex(
                    completion => completion.user && completion.user.toString() === userId
                );
                
                if (updatedMemberCompletionIndex === -1) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to add user to goal completions"
                    });
                }
                
                // Continue with the updated goal and index
                goal = updatedGoal;
                memberCompletionIndex = updatedMemberCompletionIndex;
            }
            
            // Check if user already completed this goal
            if (goal.memberCompletions[memberCompletionIndex]?.status === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: "You have already completed this goal"
                });
            }

            // Start a transaction
            const session = await Goal.startSession();
            session.startTransaction();

            try {
                // Update the user's completion status
                goal.memberCompletions[memberCompletionIndex].status = 'completed';
                goal.memberCompletions[memberCompletionIndex].completedDate = new Date();
                
                // Calculate completion percentage
                const totalMembers = goal.memberCompletions.length;
                const completedMembers = goal.memberCompletions.filter(
                    completion => completion.status === 'completed'
                ).length;
                
                goal.completionPercentage = Math.round((completedMembers / totalMembers) * 100);
                
                // If all members completed, mark the goal as completed
                if (completedMembers === totalMembers) {
                    goal.status = 'completed';
                    goal.completedDate = new Date();
                    goal.progress = 100;
                    
                    // Update group stats
                    if (group) {
                        group.completedGoals += 1;
                        group.activeGoals -= 1;
                        await group.save({ session });
                    }
                }
                
                await goal.save({ session });

                // Find user and update stats
                const user = await User.findById(userId);
                if (!user) {
                    throw new Error('User not found');
                }

                // Add tokens to user's balance
                user.tokens = (user.tokens || 0) + goal.tokenReward;
                
                // Initialize stats if not exists
                if (!user.stats) {
                    user.stats = {};
                }
                
                // Update user stats
                user.stats.goalsCompleted = (user.stats.goalsCompleted || 0) + 1;
                
                // Check if methods exist before calling them
                if (typeof user.addXP === 'function') {
                    await user.addXP(goal.xpReward);
                } else {
                    // Fallback if method doesn't exist
                    user.xp = (user.xp || 0) + goal.xpReward;
                }
                
                if (typeof user.updateStreak === 'function') {
                    await user.updateStreak();
                }
                
                if (typeof user.recordActivity === 'function') {
                    await user.recordActivity();
                }
                
                await user.save({ session });

                await session.commitTransaction();
                session.endSession();

                res.status(200).json({
                    success: true,
                    message: "Goal marked as complete for you",
                    data: goal
                });
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw error;
            }
        }
    } catch (error) {
        console.error('Error in markGoalComplete:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const getGroupGoals = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        // Verify group exists and user is a member
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }
        
        const isMember = group.members.some(member => 
            member.user.toString() === userId
        );
        
        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view this group's goals"
            });
        }

        // Get all goals for this group
        const goals = await Goal.find({
            groupId: groupId,
            isGroupGoal: true
        }).populate('user', 'username profileImage');

        // Enhance goals with user-specific completion status
        const enhancedGoals = goals.map(goal => {
            const goalObj = goal.toObject();
            
            // Find this user's completion status
            const memberCompletion = goal.memberCompletions?.find(
                completion => completion.user.toString() === userId
            );
            
            // Add user-specific completion status
            goalObj.userCompleted = memberCompletion?.status === 'completed';
            
            return goalObj;
        });

        res.status(200).json({
            success: true,
            message: "Group goals retrieved successfully",
            data: enhancedGoals
        });
    } catch (error) {
        console.error('Error in getGroupGoals:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const updateGoalProgress = async (req, res) => {
    try {
        const { goalId } = req.params;
        const { progress } = req.body;
        const userId = req.userId;

        // Validate progress value
        if (progress < 0 || progress > 100) {
            return res.status(400).json({
                success: false,
                message: "Progress must be between 0 and 100"
            });
        }

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
                message: "Not authorized to update this goal"
            });
        }

        // Update goal progress
        goal.progress = progress;
        
        // If progress is 100%, mark as completed
        if (progress === 100 && goal.status === 'active') {
            goal.status = 'completed';
            goal.completedDate = new Date();
            
            // Update user stats
            const user = await User.findById(userId);
            if (user) {
                user.tokens += goal.tokenReward;
                if (typeof user.addXP === 'function') {
                    await user.addXP(goal.xpReward);
                } else {
                    // Fallback if method doesn't exist
                    user.xp = (user.xp || 0) + goal.xpReward;
                }
                if (!user.stats) {
                    user.stats = {};
                }
                user.stats.goalsCompleted = (user.stats.goalsCompleted || 0) + 1;
                await user.save();
            }
            
            // If it's a group goal, update group stats
            if (goal.isGroupGoal && goal.groupId) {
                const group = await Group.findById(goal.groupId);
                if (group) {
                    group.activeGoals = Math.max(0, group.activeGoals - 1);
                    group.completedGoals += 1;
                    group.totalXP += goal.xpReward;
                    await group.save();
                }
            }
        }

        await goal.save();

        res.status(200).json({
            success: true,
            message: "Goal progress updated successfully",
            data: goal
        });

    } catch (error) {
        console.error('Error in updateGoalProgress:', error);
        res.status(500).json({
            success: false,
            message: "Error updating goal progress",
            error: error.message
        });
    }
};

const deleteGoal = async (req, res) => {
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
                message: "Not authorized to delete this goal"
            });
        }

        // If it's a group goal, update group stats
        if (goal.isGroupGoal && goal.groupId) {
            const group = await Group.findById(goal.groupId);
            if (group) {
                if (goal.status === 'active') {
                    group.activeGoals = Math.max(0, group.activeGoals - 1);
                } else if (goal.status === 'completed') {
                    group.completedGoals = Math.max(0, group.completedGoals - 1);
                }
                await group.save();
            }
        }

        // Delete the goal
        await Goal.findByIdAndDelete(goalId);

        res.status(200).json({
            success: true,
            message: "Goal deleted successfully"
        });

    } catch (error) {
        console.error('Error in deleteGoal:', error);
        res.status(500).json({
            success: false,
            message: "Error deleting goal",
            error: error.message
        });
    }
};

module.exports = {
  createGoal,
  getGoals,
  markGoalComplete,
  updateGoalProgress,
  deleteGoal,
  getGroupGoals
};