const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const jwtConfig = require('../config/jwt.config');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../config/email.config');

// Register a new user
const register = async (req, res) => {
    try {
        const { email, password, username } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Email and password are required' 
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'User already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            email,
            password: hashedPassword,
            username: username || email.split('@')[0],
            // Initialize activity array with today's entry
            activity: [{
                date: new Date(),
                count: 1
            }]
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            jwtConfig.secret,
            { expiresIn: jwtConfig.tokenExpiration }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: jwtConfig.cookieExpiration
        });

        // Return user data without sensitive information
        const userData = {
            id: user._id,
            email: user.email,
            username: user.username,
            level: user.level,
            totalXP: user.totalXP,
            currentStreak: user.currentStreak,
            profileImage: user.profileImage,
            createdAt: user.createdAt
        };

        res.status(201).json({ 
            success: true,
            message: 'User created successfully',
            data: userData
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Email and password are required' 
            });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Update user streak
        await user.updateStreak();
        
        // Record login activity
        await user.recordActivity();

        // Set token expiration based on "remember me" option
        const expiresIn = rememberMe 
            ? jwtConfig.extendedTokenExpiration 
            : jwtConfig.tokenExpiration;

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            jwtConfig.secret,
            { expiresIn }
        );

        // Set cookie expiration
        const cookieMaxAge = rememberMe 
            ? jwtConfig.extendedCookieExpiration 
            : jwtConfig.cookieExpiration;

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: cookieMaxAge
        });

        // Return user data without sensitive information
        const userData = {
            id: user._id,
            email: user.email,
            username: user.username,
            level: user.level,
            totalXP: user.totalXP,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            profileImage: user.profileImage,
            bio: user.bio,
            stats: user.stats,
            tokens: user.tokens,
            badges: user.badges,
            topCategories: user.topCategories,
            createdAt: user.createdAt
        };

        res.json({ 
            success: true,
            message: 'Login successful',
            data: userData,
            token: token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Logout user
const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ 
        success: true,
        message: 'Logout successful' 
    });
};

// Get current user profile
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Update user streak
        await user.updateStreak();

        // Return user data without sensitive information
        const userData = {
            id: user._id,
            email: user.email,
            username: user.username,
            level: user.level,
            totalXP: user.totalXP,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            profileImage: user.profileImage,
            bio: user.bio,
            stats: user.stats,
            tokens: user.tokens,
            badges: user.badges,
            topCategories: user.topCategories,
            activity: user.activity,
            createdAt: user.createdAt,
            settings: user.settings
        };

        res.json({ 
            success: true,
            data: userData 
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { username, bio, profileImage } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Update fields if provided
        if (username) user.username = username;
        if (bio !== undefined) user.bio = bio;
        if (profileImage !== undefined) user.profileImage = profileImage;
        
        await user.save();

        // Return updated user data
        const userData = {
            id: user._id,
            email: user.email,
            username: user.username,
            profileImage: user.profileImage,
            bio: user.bio
        };

        res.json({ 
            success: true,
            message: 'Profile updated successfully',
            data: userData 
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false,
                message: 'Current password and new password are required' 
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                message: 'Current password is incorrect' 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        
        await user.save();

        res.json({ 
            success: true,
            message: 'Password updated successfully' 
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false,
                message: 'Email is required' 
            });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            // For security reasons, don't reveal that the user doesn't exist
            return res.json({ 
                success: true,
                message: 'If your email is registered, you will receive a password reset link' 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Hash token and save to user
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
            
        // Token expires in 1 hour
        user.resetPasswordExpires = Date.now() + 3600000;
        
        await user.save();

        // Send the password reset email
        const emailSent = await sendPasswordResetEmail(user.email, resetToken);
        
        // Log token in development for testing purposes
        if (process.env.NODE_ENV === 'development') {
            console.log(`Password reset token for ${email}: ${resetToken}`);
            console.log(`Reset URL: ${process.env.CLIENT_URL}/reset-password/${resetToken}`);
        }

        res.json({ 
            success: true,
            message: 'If your email is registered, you will receive a password reset link',
            // Only include debug info in development
            debug: process.env.NODE_ENV === 'development' ? {
                resetToken,
                resetUrl: `${process.env.CLIENT_URL}/reset-password/${resetToken}`
            } : undefined
        });
    } catch (error) {
        console.error('Request password reset error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
// Reset password with token
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ 
                success: false,
                message: 'Token and new password are required' 
            });
        }
        
        // Hash token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
            
        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid or expired token' 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update user
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();

        res.json({ 
            success: true,
            message: 'Password has been reset successfully' 
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Delete user account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.userId;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Delete user
        await User.findByIdAndDelete(userId);
        
        // Clear auth cookie
        res.clearCookie('token');

        res.json({ 
            success: true,
            message: 'Account deleted successfully' 
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    getCurrentUser,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    deleteAccount
};