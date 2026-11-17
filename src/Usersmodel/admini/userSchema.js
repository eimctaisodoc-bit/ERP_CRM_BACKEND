const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema({    
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true,unique: true   },
    role: { type: String, enum: ['admin', 'staff','client'], default: 'admin' },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
    socketId: { type: String, default: null }
});
module.exports = mongoose.model('AdminUserSchema', AdminUserSchema);
