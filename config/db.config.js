const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        // Replace with your actual MongoDB Atlas URI
        const uri = "mongodb+srv://Raghu:system@cluster0.tvkq752.mongodb.net/your_database_name?retryWrites=true&w=majority";

        mongoose.set('strictQuery', false); // Add this to handle the deprecation warning

        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Atlas connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;