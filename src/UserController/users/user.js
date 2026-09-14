const mongoose = require('mongoose');
const userScheme = require('../../Usersmodel/UserSchema.js')
const Branch = require("../../Usersmodel/supper/model.branch")

const VerifyLoginUser = async (req, res, next) => {
    console.log("Login attempt:", req.body);
};
const addUsers = async (req, res) => {
    try {
        // console.log(req.body)
        const user = await userScheme.create(req.body)
        // console.log(user)
        res.status(200).json({ message: user, success: true });
        // res.status(500).json({ message: "account is creating ", success: true });
    } catch (error) {
        res.status(500).json({ message: error.message })

    }
}
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user id" });
        }

        const user = await userScheme.findById({ _id: id })
            || await Branch.findById({ _id: id });


        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user" });
    }
};
module.exports = { addUsers, getUserById, VerifyLoginUser }