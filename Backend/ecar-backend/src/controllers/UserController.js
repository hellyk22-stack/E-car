const userSchema = require("../models/UserModel")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const registerUser = async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const savedUser = await userSchema.create({
            ...req.body,
            password: hashedPassword
        })
        res.status(201).json({
            message: "User registered successfully",
            data: savedUser
        })
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Error while registering user",
            err: err
        })
    }
}

const loginUser = async (req, res) => {
    try {
        const foundUser = await userSchema.findOne({ email: req.body.email })
        if (!foundUser) {
            return res.status(404).json({
                message: "User not found"
            })
        }
        const isMatch = await bcrypt.compare(req.body.password, foundUser.password)
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            })
        }
        const token = jwt.sign(
            { id: foundUser._id, role: foundUser.role },
            process.env.JWT_SECRET || "ecar_secret",
            { expiresIn: "1d" }
        )
        res.status(200).json({
            message: "Login successful",
            token: token,
            role: foundUser.role
        })
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Error while logging in",
            err: err
        })
    }
}

const getAllUsers = async (req, res) => {
    try {
        const users = await userSchema.find()
        res.json({
            message: "All users",
            data: users
        })
    } catch (err) {
        res.status(500).json({
            message: "Error while fetching users",
            err: err
        })
    }
}

module.exports = {
    registerUser,
    loginUser,
    getAllUsers
}