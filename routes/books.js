const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
// const User = require("../models/userModel");
// const fs = require("fs");
// const path = require("path");
const apiAuth = require("../middleware/auth");
const { getBooks, addBook, getBookById, uploadBookImages, deleteBookImage, updateBook, deleteBook } = require("../controller/bookController");
const SECRET = process.env.JWT_SECRET;

// POST /api/register
router.get("/", getBooks);

router.post("/", [
    body("title").not().isEmpty().withMessage("Title is required"),
    body("author").not().isEmpty().withMessage("Author is required"),
    body("genre").not().isEmpty().withMessage("Genre is required"),
    body("price").not().isEmpty().isNumeric().withMessage("Price is required").custom((value) => {
        if (value < 0) {
            throw new Error('Price cannot be negative');
        }
        return true; // Return true if validation passes
    }),
    body("stockQuantity").not().isEmpty().isNumeric().withMessage("Valid Stock Quantity is required").custom((value) => {
        if (value < 0) {
            throw new Error('Stock cannot be negative');
        }
        return true; // Return true if validation passes
    }), ,

], apiAuth, addBook);

router.get('/:id', getBookById);

router.post('/:id/images',apiAuth,  uploadBookImages );

router.patch('/:id', apiAuth, updateBook);

router.delete('/:id/images/:imageId', apiAuth, deleteBookImage);

router.delete('/:id', apiAuth, deleteBook);


module.exports = router;