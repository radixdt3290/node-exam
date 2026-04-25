const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
const apiAuth = require("../middleware/auth");
const { registerUser, loginUser } = require("../controller/authController");
const SECRET = process.env.JWT_SECRET;

// POST /api/register
router.post("/register", [
    body("name").not().isEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isStrongPassword({
        minLength: 10,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }).withMessage("Password must be at least 10 characters long, one Capital, small and special characters required"),
], registerUser);

router.post("/login", [
    body("email").isEmail().not().isEmpty().withMessage("Valid email is required"),
    body("password").not().isEmpty().withMessage("Password is required"),
], loginUser);



module.exports = router;