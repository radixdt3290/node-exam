const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Book, BookImage } = require("../models/bookModel");
const { validationResult } = require("express-validator");
const { Op } = require('sequelize')
const FileType = require('file-type');
const path = require('path');
const fs = require('fs');
const upload = require('../config/upload');

const makeError = (code, message, details) => {
    const err = new Error(message);
    err.statusCode = code;
    err.details = details; // Attach extra data
    return err;
}


//need to check proper
const getBooks = async (req, res) => {
    try {
        // Destructure and set defaults for query parameters
        let { page = 1, limit = 20, genre, author, minPrice, maxPrice } = req.query;

        // Convert types and enforce limits
        page = parseInt(page);
        limit = Math.min(parseInt(limit), 100);
        const offset = (page - 1) * limit;

        // Build Filter Object
        const whereClause = {
            is_deleted: '0' // Always hide soft-deleted books
        };

        // Filter by Stock: Hide if no admin token is present
        let isAdmin = false;
        const authHeader = req.headers['authorization'];

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET );
                if (decoded.role === 'admin') {
                    isAdmin = true;
                }
            } catch (err) {
                isAdmin = false;
            }
        }
        if (!isAdmin) {
            whereClause.stockQuantity = { [Op.gt]: 0 };
        }

        // Optional Filters
        if (genre) whereClause.genre = genre;
        if (author) whereClause.author = author;
        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
            if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
        }

        // Database Query
        const { count, rows } = await Book.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            include: [{
                model: BookImage,
                as: 'book_images',
                attributes: ['originalFileName', 'displayOrder'],
            }],
            order: [
                ['createdAt', 'DESC'],
                [{ model: BookImage, as: 'book_images' }, 'displayOrder', 'ASC']
            ],
            distinct: true // Ensures count is accurate with includes
        });

        // 4. Send Response
        res.json({
            data: rows,
            meta: {
                page,
                limit,
                total: count
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


const addBook = async (req, res, next) => {
    if (req.user.role != 'admin') {
        const err = makeError(422, "Only admin can add books")
        return next(err);
    }

    const errors = validationResult(req);

    // Check any details wrong using express validator
    if (!errors.isEmpty()) {
        const err = makeError(422, "Validation Failed", errors.array())
        return next(err);
    }

    try {
        const { title, author, genre, price, stockQuantity } = req.body;

        const newBook = await Book.create({
            title,
            author,
            genre,
            price,
            stockQuantity,
            is_deleted: '0' // Default state
        });

        // 4. Return success
        return res.status(201).json(newBook);
    } catch (err) {
        next(err);

    }
}

//checked
const getBookById = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch book with images
        const book = await Book.findOne({
            where: {
                id: id,
                is_deleted: '0' // Exclude soft-deleted books
            },
            include: [{
                model: BookImage,
                as: 'book_images',
                attributes: ['originalFileName', 'displayOrder']
            }],
            // Ensure images are returned in display order
            order: [
                [{ model: BookImage, as: 'book_images' }, 'displayOrder', 'ASC']
            ]
        });

        // Error handling for non-existent or soft-deleted books
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Return book details
        res.json(book);

    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const uploadBookImages = async (req, res, next) => {
    // Execute Multer
    upload.array('images', 5)(req, res, async (err) => {
        // Handle Multer-specific errors
        if (err) {
            return next(makeError(400, "Upload error", err.message));
        }

        const uploadedFiles = req.files || [];
        const bookId = req.params.id;

        // If no files were selected
        if (uploadedFiles.length === 0) {
            return next(makeError(400, "No images provided", "Please select at least one file to upload."));
        }

        try {
            // Verify book existence
            const book = await Book.findOne({
                where: { id: bookId, is_deleted: '0' },
                include: [{ model: BookImage }]
            });

            if (!book) {
                cleanupFiles(uploadedFiles);
                return next(makeError(404, "Book not found", `No active book found with ID ${bookId}`));
            }

            // Validate total image count (Limit 5)
            const currentImages = book.book_images || [];
            const currentCount = currentImages.length;
            const remainingSlots = 5 - currentCount;

            if (uploadedFiles.length > remainingSlots) {
                cleanupFiles(uploadedFiles);
                return next(makeError(400, "Image limit exceeded", {
                    totalAllowed: 5,
                    currentlyHas: currentCount,
                    slotsRemaining: remainingSlots
                }));
            }

            const savedImages = [];

            // 4. Validate Content & Save
            for (let i = 0; i < uploadedFiles.length; i++) {
                const file = uploadedFiles[i];

                const type = await FileType.fromFile(file.path);
                const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

                if (!type || !allowedMimes.includes(type.mime)) {
                    cleanupFiles(uploadedFiles);
                    return next(makeError(400, "Invalid file type", `File ${file.originalname} is not a valid JPEG, PNG, or WebP.`));
                }

                // Create database record
                const newImg = await BookImage.create({
                    bookId: book.id,
                    originalFileName: file.originalname,
                    displayOrder: currentCount + i + 1,
                    storedFileName : file.filename
                });
                savedImages.push(newImg);
            }

            // Success
            return res.status(201).json(savedImages);

        } catch (dbError) {
            cleanupFiles(uploadedFiles);
            return next(dbError);
        }
    });
};

const cleanupFiles = (files) => {
    if (!files) return;
    files.forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
};



const deleteBookImage = async (req, res, next) => {
    // Admin check (if not already handled by middleware)
    if (!req.user || req.user.role !== 'admin') {
        return next(makeError(401, "Unauthorized", "Admin access required"));
    }

    const { id: bookId, imageId } = req.params;

    try {
        // Find the image and ensure it belongs to the specified book
        const image = await BookImage.findOne({
            where: {
                id: imageId,
                bookId: bookId
            },
            // Include book to ensure the book isn't soft-deleted
            include: [{
                model: Book,
                where: { is_deleted: '0' }
            }]
        });

        // Error if image/book doesn't exist or mismatch
        if (!image) {
            return next(makeError(404, "Not Found", "The image does not exist or does not belong to this book."));
        }

        // Delete the physical file from the 'uploads/' folder
        const filePath = path.join(__dirname, '../uploads', image.storedFileName);


        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete the database record
        await image.destroy();

        return res.status(200).json({
            success: true,
            message: "Image deleted successfully from database and storage."
        });

    } catch (error) {
        return next(error);
    }
};





const updateBook = async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return next(makeError(401, "Unauthorized", "Admin access required"));
    }
    const { id } = req.params;

    try {
        //  Check if book exists and is not soft-deleted
        const book = await Book.findOne({
            where: { id, is_deleted: '0' }
        });

        if (!book) {
            return next(makeError(404, "Book not found", `No active book found with ID ${id}`));
        }

        // Update provided fields

        await book.update(req.body);

        // Fetch updated book with images for the response
        const updatedBook = await Book.findByPk(id, {
            include: [{ 
                model: BookImage, 
                as: 'book_images',
                attributes: ['id', 'originalFileName', 'displayOrder'] 
            }]
        });

        return res.status(200).json(updatedBook);

    } catch (error) {
        return next(error);
    }
};



const deleteBook = async (req, res, next) => {
        // Admin check (if not already handled by middleware)
    if (!req.user || req.user.role !== 'admin') {
        return next(makeError(401, "Unauthorized", "Admin access required"));
    }
    const { id } = req.params;

    try {
        // Find the book
        const book = await Book.findOne({
            where: { id, is_deleted: '0' }
        });

        // Error if doesn't exist or already soft-deleted
        if (!book) {
            return next(makeError(404, "Not Found", "Book does not exist or has already been deleted."));
        }

        // Perform soft-delete (Set flag to '1')
        await book.update({ is_deleted: '1' });

        return res.status(200).json({ 
            success: true, 
            message: "Book soft-deleted successfully." 
        });

    } catch (error) {
        return next(error);
    }
};




module.exports = { getBooks, addBook, getBookById, uploadBookImages, deleteBookImage, updateBook, deleteBook }