const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
// const UserSchema = require("../Usersmodel/UserSchema");



const connectDB = async () => {
    const mongoUrl = process.env.MONGODB_URL?.trim();
    if (!mongoUrl) {
        throw new Error('MONGODB_URL is required in backend/.env or the process environment.');
    }

    let conn;
    try {
        conn = await mongoose.connect(mongoUrl, { dbName: process.env.dbName });
    } catch (error) {
        const reason = error instanceof Error ? error.name : 'UnknownError';
        console.error(`MongoDB connection failed (${reason}). Check MONGODB_URL and database availability.`);
        throw new Error(`MongoDB connection failed (${reason}).`);
    }

    const actualDatabaseName = conn.connection.name;
    if (actualDatabaseName !== process.env.dbName) {
        await mongoose.disconnect();
        throw new Error(
            `Connected to unexpected MongoDB database "${actualDatabaseName || '<unknown>'}"; expected "${process.env.dbName}".`
        );
    }

    /* console.log(`MongoDB connected: ${conn.connection.host}/${actualDatabaseName}`); */
    return conn;
};
module.exports = connectDB;