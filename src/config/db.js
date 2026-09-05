const mongoose = require('mongoose');
require('dotenv').config();
// const UserSchema = require("../Usersmodel/UserSchema");

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL);
        //     console.log(`Host: ${conn.connection.host}`);
        //     console.log(`Database Name: ${conn.connection.name}`);
        //    console.log("Mongoose is looking in collection:", UserSchema.collection.name);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};
module.exports = connectDB; 