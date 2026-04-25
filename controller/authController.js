const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { validationResult } = require("express-validator");

const SECRET = process.env.JWT_SECRET || "secret123";


const registerUser = async (req, res, next) => {
    const errors = validationResult(req);

    // Check any details wrong using express validator
    if (!errors.isEmpty()) {
        const err = new Error("Validation Failed");
        err.statusCode = 422;
        err.details = errors.array(); // Attach extra data
        return next(err);
    }

    try {
        const { name, email, password, secret } = req.body;
        let role = 'user';  //default role

        // Check for secret key to make user admin
        if (secret == process.env.REGISTER_SECRET) {
            role = "admin"
        }
        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            const err = new Error("User already exists with this email id");
            err.statusCode = 409;
            return next(err);
        }

        const hash = await bcrypt.hash(req.body.password, 10);  // Hash the password and create user
        const user = await User.create({ name, email, password: hash, role })   // Create user with role
        res.status(201).json({ message: "Registered successfully", userId: user.id, name: user.name, email: user.email,role: user.role, });
    } catch (err) {
        console.log(err);
        next(err);
        // res.status(400).json({ message: "Registration failed due to some error please try again" })
    }

}


const loginUser = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const err = new Error("Validation Failed");
        err.statusCode = 422;
        err.details = errors.array();
        return next(err);
    }

    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });  // Find user by email

        if (!user) {
            const err = new Error("Invalid credentials");
            err.statusCode = 401;
            return next(err);
        }

        const isMatch = await bcrypt.compare(password, user.password);  // Compare password

        if (!isMatch) {
            const err = new Error("Invalid credentials");
            err.statusCode = 401;
            return next(err);
        }

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: "1d" });  // Generate JWT token

        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });  // Set cookie
        res.status(200).json({
            message: "Login successful",
            token,
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (err) {
        console.log(err);
        next(err);
        res.status(500).json({ message: "Login failed due to some error please try again" })
    }
}



module.exports = { registerUser, loginUser };