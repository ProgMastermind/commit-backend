// controllers/groupController.js

const Group = require('../models/Group');
const User = require('../models/user.model');
const mongoose = require('mongoose');

// Create a new group
const createGroup = async (req, res) => {
    try {
        const { name, maxMembers } = req.body;
        const creatorId = req.userId;

        // Validate input
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Group name is required"
            });
        }

        // Validate maxMembers
        if (maxMembers && (maxMembers < 2 || maxMembers > 10)) {
            return res.status(400).json({
                success: false,
                message: "Group size must be between 2 and 10 members"
            });
        }

        // Create group with creator as admin
        const newGroup = new Group({
            name,
            creator: creatorId,
            maxMembers: maxMembers || 10, // Use provided size or default to 10
            members: [{ 
                user: creatorId, 
                role: 'admin'
            }]
        });

        await newGroup.save();

        // Populate member details before sending response
        const populatedGroup = await Group.findById(newGroup._id)
            .populate('members.user', 'email')
            .populate('creator', 'email');

        res.status(201).json({
            success: true,
            message: "Group created successfully",
            data: populatedGroup
        });

    } catch (error) {
        console.error('Error in createGroup:', error);
        res.status(500).json({
            success: false,
            message: "Error creating group",
            error: error.message
        });
    }
};

// Get all user's groups
const getUserGroups = async (req, res) => {
    try {
        const userId = req.userId;

        const groups = await Group.find({
            'members.user': userId
        })
        .populate('members.user', 'email')
        .populate('creator', 'email')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: groups
        });

    } catch (error) {
        console.error('Error in getUserGroups:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching user groups",
            error: error.message
        });
    }
};

// Get specific group details
const getGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID format"
            });
        }

        const group = await Group.findById(groupId)
            .populate('members.user', 'email')
            .populate('creator', 'email');

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Verify user is a member of the group
        const isMember = group.members.some(member => 
            member.user._id.toString() === userId
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this group"
            });
        }

        res.status(200).json({
            success: true,
            data: group
        });

    } catch (error) {
        console.error('Error in getGroupDetails:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching group details",
            error: error.message
        });
    }
};

// Add member to group
const addMemberByEmail = async (req, res) => {
    try {
        const { groupId, email } = req.body;
        const requesterId = req.userId;

        // Validate inputs
        if (!groupId || !email) {
            return res.status(400).json({
                success: false,
                message: "Group ID and email are required"
            });
        }

        // Find the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check if requester is admin
        const isAdmin = group.members.some(member => 
            member.user.toString() === requesterId.toString() && 
            member.role === 'admin'
        );

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only group admins can add members"
            });
        }

        // Check group size limit
        if (group.members.length >= group.maxMembers) {
            return res.status(400).json({
                success: false,
                message: `Group has reached maximum size of ${group.maxMembers} members`
            });
        }

        // Find user by email
        const userToAdd = await User.findOne({ email });
        if (!userToAdd) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if user is already a member
        const isMember = group.members.some(member => 
            member.user.toString() === userToAdd._id.toString()
        );

        if (isMember) {
            return res.status(400).json({
                success: false,
                message: "User is already a member of this group"
            });
        }

        // Add new member
        group.members.push({
            user: userToAdd._id,
            role: 'member'
        });

        await group.save();

        // Get updated group with populated data
        const updatedGroup = await Group.findById(groupId)
            .populate('members.user', 'email')
            .populate('creator', 'email');

        res.status(200).json({
            success: true,
            message: "Member added successfully",
            data: updatedGroup
        });

    } catch (error) {
        console.error('Error in addMemberByEmail:', error);
        res.status(500).json({
            success: false,
            message: "Error adding member",
            error: error.message
        });
    }
};

module.exports = {
    createGroup,
    getUserGroups,
    getGroupDetails,
    addMemberByEmail
};