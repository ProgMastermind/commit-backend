// controllers/groupController.js

const Group = require('../models/Group');
const User = require('../models/user.model');
const Goal = require('../models/Goal');

// Create a new group
const createGroup = async (req, res) => {
    try {
        const { name, description, category, privacy, maxMembers } = req.body;
        const userId = req.userId;

        // Validate input
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Group name is required'
            });
        }

        // Generate invite code for all groups (not just private ones)
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Create group
        const newGroup = new Group({
            name,
            description: description || '',
            category: category || 'other',
            creator: userId,
            privacy: privacy || 'public',
            maxMembers: maxMembers || 10,
            inviteCode: inviteCode, // Always set an invite code
            members: [{
                user: userId,
                role: 'admin',
                joinedAt: new Date()
            }],
            activeGoals: 0,
            completedGoals: 0,
            completionRate: 0
        });

        await newGroup.save();

        // Update user stats
        const user = await User.findById(userId);
        if (user) {
            user.stats = user.stats || {};
            user.stats.groupsJoined = (user.stats.groupsJoined || 0) + 1;
            await user.save();
        }

        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: newGroup
        });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all groups the user is a member of
const getUserGroups = async (req, res) => {
    try {
        const userId = req.userId;

        // Find all groups where user is a member
        const userGroups = await Group.find({
            'members.user': userId
        }).populate('creator', 'username profileImage');

        // Find public groups user is not a member of (for discovery)
        const discoverGroups = await Group.find({
            'members.user': { $ne: userId },
            privacy: 'public'
        }).limit(10).populate('creator', 'username profileImage');

        // For each group, calculate the completion rate
        const userGroupsWithStats = await Promise.all(userGroups.map(async (group) => {
            const groupObj = group.toObject();
            
            // Get all group goals
            const goals = await Goal.find({
                groupId: group._id,
                isGroupGoal: true
            });
            
            const totalGoals = goals.length;
            const completedGoals = goals.filter(goal => goal.status === 'completed').length;
            
            // Calculate completion rate
            const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
            
            return {
                ...groupObj,
                isMember: true,
                isAdmin: group.members.some(m => 
                    m.user.toString() === userId && m.role === 'admin'
                ),
                activeGoals: totalGoals - completedGoals,
                completedGoals,
                completionRate
            };
        }));

        // Combine and format results
        const allGroups = [
            ...userGroupsWithStats,
            ...discoverGroups.map(group => ({
                ...group.toObject(),
                isMember: false,
                isAdmin: false,
                activeGoals: 0,
                completedGoals: 0,
                completionRate: 0
            }))
        ];

        res.status(200).json({
            success: true,
            message: 'Groups retrieved successfully',
            data: allGroups
        });
    } catch (error) {
        console.error('Error getting user groups:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get a single group by ID
const getGroupById = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        const group = await Group.findById(groupId)
            .populate('creator', 'username profileImage')
            .populate('members.user', 'username profileImage');

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Check if user is a member if the group is private
        if (group.privacy === 'private') {
            const isMember = group.members.some(m => m.user._id.toString() === userId);
            if (!isMember) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this private group'
                });
            }
        }

        // Get group goals and calculate stats
        const goals = await Goal.find({
            groupId: groupId,
            isGroupGoal: true
        }).populate('user', 'username profileImage');

        const totalGoals = goals.length;
        const completedGoals = goals.filter(goal => goal.status === 'completed').length;
        const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

        // Format response
        const formattedGroup = {
            ...group.toObject(),
            isMember: group.members.some(m => m.user._id.toString() === userId),
            isAdmin: group.members.some(m => 
                m.user._id.toString() === userId && m.role === 'admin'
            ),
            goals: goals,
            activeGoals: totalGoals - completedGoals,
            completedGoals,
            completionRate
        };

        res.status(200).json({
            success: true,
            message: 'Group retrieved successfully',
            data: formattedGroup
        });
    } catch (error) {
        console.error('Error getting group:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Join a group
const joinGroup = async (req, res) => {
    try {
        const { groupId, inviteCode } = req.body;
        const userId = req.userId;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Check if user is already a member
        const isMember = group.members.some(m => m.user.toString() === userId);
        if (isMember) {
            return res.status(400).json({
                success: false,
                message: 'You are already a member of this group'
            });
        }

        // Check if group is at max capacity
        if (group.members.length >= group.maxMembers) {
            return res.status(400).json({
                success: false,
                message: 'Group has reached maximum capacity'
            });
        }

        // Check if invite code is required and valid
        if (group.privacy === 'private') {
            if (!inviteCode || inviteCode !== group.inviteCode) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid invite code'
                });
            }
        }

        // Add user to group
        group.members.push({
            user: userId,
            role: 'member',
            joinedAt: new Date()
        });

        await group.save();

        // Update user stats
        const user = await User.findById(userId);
        if (user) {
            user.stats = user.stats || {};
            user.stats.groupsJoined = (user.stats.groupsJoined || 0) + 1;
            await user.save();
        }

        res.status(200).json({
            success: true,
            message: 'Successfully joined group',
            data: group
        });
    } catch (error) {
        console.error('Error joining group:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Leave a group
const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Check if user is a member
        const memberIndex = group.members.findIndex(m => m.user.toString() === userId);
        if (memberIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'You are not a member of this group'
            });
        }

        // Check if user is the only admin
        const isAdmin = group.members[memberIndex].role === 'admin';
        const adminCount = group.members.filter(m => m.role === 'admin').length;

        if (isAdmin && adminCount === 1 && group.members.length > 1) {
            return res.status(400).json({
                success: false,
                message: 'You cannot leave the group as you are the only admin. Please assign another admin first.'
            });
        }

        // Remove user from group
        group.members.splice(memberIndex, 1);

        // If no members left, delete the group
        if (group.members.length === 0) {
            await Group.findByIdAndDelete(groupId);
            
            // Delete all group goals
            await Goal.deleteMany({ groupId, isGroupGoal: true });
            
            return res.status(200).json({
                success: true,
                message: 'You left the group and it was deleted as no members remain'
            });
        }

        await group.save();

        res.status(200).json({
            success: true,
            message: 'Successfully left group'
        });
    } catch (error) {
        console.error('Error leaving group:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update group details
const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, category, privacy, maxMembers } = req.body;
        const userId = req.userId;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Check if user is an admin
        const isAdmin = group.members.some(m => 
            m.user.toString() === userId && m.role === 'admin'
        );

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only group admins can update group details'
            });
        }

        // Update fields
        if (name) group.name = name;
        if (description !== undefined) group.description = description;
        if (category) group.category = category;
        if (privacy) {
            group.privacy = privacy;
            // Generate new invite code if changing to private
            if (privacy === 'private' && !group.inviteCode) {
                group.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            }
        }
        if (maxMembers && maxMembers >= group.members.length) {
            group.maxMembers = maxMembers;
        }

        await group.save();

        res.status(200).json({
            success: true,
            message: 'Group updated successfully',
            data: group
        });
    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Generate new invite code
const generateInviteCode = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Check if user is an admin
        const isAdmin = group.members.some(m => 
            m.user.toString() === userId && m.role === 'admin'
        );

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only group admins can generate new invite codes'
            });
        }

        // Generate new invite code
        group.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        await group.save();

        res.status(200).json({
            success: true,
            message: 'New invite code generated',
            data: {
                inviteCode: group.inviteCode
            }
        });
    } catch (error) {
        console.error('Error generating invite code:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Join a group by invite code
const joinGroupByCode = async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const userId = req.userId;

        if (!inviteCode) {
            return res.status(400).json({
                success: false,
                message: 'Invite code is required'
            });
        }

        // Find group by invite code
        const group = await Group.findOne({ inviteCode });
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'No group found with this invite code'
            });
        }

        // Check if user is already a member
        const isMember = group.members.some(m => m.user.toString() === userId);
        if (isMember) {
            return res.status(400).json({
                success: false,
                message: 'You are already a member of this group'
            });
        }

        // Check if group is at max capacity
        if (group.members.length >= group.maxMembers) {
            return res.status(400).json({
                success: false,
                message: 'Group has reached maximum capacity'
            });
        }

        // Add user to group
        group.members.push({
            user: userId,
            role: 'member',
            joinedAt: new Date()
        });

        await group.save();

        // Update user stats
        const user = await User.findById(userId);
        if (user) {
            user.stats = user.stats || {};
            user.stats.groupsJoined = (user.stats.groupsJoined || 0) + 1;
            await user.save();
        }

        res.status(200).json({
            success: true,
            message: 'Successfully joined group',
            data: group
        });
    } catch (error) {
        console.error('Error joining group by code:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    createGroup,
    getUserGroups,
    getGroupById,
    joinGroup,
    leaveGroup,
    updateGroup,
    generateInviteCode,
    joinGroupByCode
};