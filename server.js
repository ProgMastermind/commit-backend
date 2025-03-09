const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db.config');
const authRoutes = require('./routes/auth.routes');
const achievementRoutes = require('./routes/achievementRoutes');
const marketplaceRoutes = require('./routes/marketplace');
const groupRoutes = require('./routes/groupRoutes');
const cors = require('cors');
const goalRoutes = require('./routes/goalRoutes');
const app = express();

// CORS middleware should come before other middleware and routes
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400 // 24 hours
}));

// Error handling for CORS preflight
app.options('*', cors());

// Other Middleware
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// Routes

app.use('/api/achievements', achievementRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    
    if (err.name === 'CORSError') {
        res.status(403).json({ message: 'CORS error: ' + err.message });
    } else if (err.name === 'ValidationError') {
        res.status(400).json({ message: err.message });
    } else if (err.name === 'UnauthorizedError') {
        res.status(401).json({ message: 'Unauthorized: ' + err.message });
    } else {
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});