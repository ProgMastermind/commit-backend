const jwt = require('jsonwebtoken');
const { secret } = require('../config/jwt.config');

const authenticateToken = (req, res, next) => {
    try {
        console.log('Authenticating request...');
        
        // Check for token in cookies first
        let token = req.cookies.token;
        let tokenSource = 'cookie';

        // If no cookie token, check Authorization header
        if (!token) {
            const authHeader = req.header('Authorization');
            console.log('Auth header:', authHeader ? 'present' : 'missing');
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.replace('Bearer ', '');
                tokenSource = 'header';
            }
        }

        // If no token found in either place
        if (!token) {
            console.log('No token found in request');
            return res.status(401).json({
                success: false,
                message: 'Authentication required. No token provided.'
            });
        }

        console.log(`Token found in ${tokenSource}`);

        // Verify token
        const decoded = jwt.verify(token, secret);
        
        // Set user data in request
        req.userId = decoded.userId;
        console.log("Authenticated userId:", req.userId);
        req.user = decoded; // Adding full decoded payload for flexibility

        next();
    } catch (error) {
        console.error('Authentication Error:', error.message);
        
        // Handle different types of JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please log in again.'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: 'Invalid token. Please log in again.'
            });
        }

        // Generic error response
        return res.status(403).json({
            success: false,
            message: 'Authentication failed. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = { authenticateToken };