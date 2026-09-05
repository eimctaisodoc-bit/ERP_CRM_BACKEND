const mongoose = require('mongoose');

const StaffUserSchema = new mongoose.Schema({
    staffId: { type: String, required: true, unique: true },
    role: { type: String, enum: ['staff'], default: 'staff' },
    Fname: { type: String, required: true },
    Lname: { type: String, required: true },
    position: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },

});
module.exports = mongoose.model('StaffUserSchema', StaffUserSchema);
