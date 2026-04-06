const userSchema = require("../models/UserModel")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const sendMail = require("../utils/MailUtil")

const JWT_SECRET = process.env.JWT_SECRET || "ecar_secret"

const registerUser = async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const savedUser = await userSchema.create({
            ...req.body,
            password: hashedPassword
        })
        try {
            await sendMail(
                savedUser.email,
                "Welcome to E-CAR 🚗",
                `<h2>Hi ${savedUser.name}!</h2>
                 <p>Welcome to E-CAR. Your account has been created successfully.</p>`
            )
        } catch (mailErr) {
            console.log("Mail failed but user registered:", mailErr.message)
        }
        res.status(201).json({
            message: "User registered successfully",
            data: savedUser
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "Error while registering user",
            err: err
        })
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body
        const foundUser = await userSchema.findOne({ email: email })
        if (!foundUser) {
            return res.status(404).json({ message: "User not found" })
        }
        const isMatch = await bcrypt.compare(password, foundUser.password)
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" })
        }
        const token = jwt.sign(
            { id: foundUser._id, role: foundUser.role },
            JWT_SECRET,
            { expiresIn: "30d" }
        )
        res.status(200).json({
            message: "Login successful",
            token: token,
            role: foundUser.role,
            name: foundUser.name   // ✅ sends name to frontend
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Error while logging in",
            error: error
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