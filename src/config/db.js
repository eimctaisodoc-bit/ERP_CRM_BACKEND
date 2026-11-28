
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

// MongoDB connection cache
let cached = global.__mongooseCache;

if (!cached) {
  cached = global.__mongooseCache = {
    conn: null,
    promise: null,
  };
}

const connectDB = async () => {
  // Reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUrl = process.env.MONGODB_URL?.trim();

  if (!mongoUrl) {
    throw new Error("MONGODB_URL is required.");
  }

  const expectedDbName = process.env.dbName?.trim();

  // Create connection promise only once
  if (!cached.promise) {
    const connectOptions = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      ...(expectedDbName
        ? { dbName: expectedDbName }
        : {}),
    };

    cached.promise = mongoose
      .connect(mongoUrl, connectOptions)
      .then(async (connection) => {
        const actualDatabaseName = connection.connection.name;

        if (
          expectedDbName &&
          actualDatabaseName !== expectedDbName
        ) {
          await mongoose.disconnect();

          throw new Error(
            `Expected database "${expectedDbName}", got "${actualDatabaseName}".`
          );
        }

        return connection;
      })
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;

    console.log(
      `MongoDB connected: ${cached.conn.connection.name}`
    );

    return cached.conn;

  } catch (error) {
    cached.promise = null;
    cached.conn = null;

    console.error("MongoDB connection failed:", error.message);

    throw error;
  }
};

module.exports = connectDB;
