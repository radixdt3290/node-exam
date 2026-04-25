const sequelize = require('../config/dbConnection')
const { Order, OrderProduct, OrderAddress } = require('../models/orderModel');
const { Book } = require('../models/bookModel');
const User = require('../models/userModel');
const Review = require('../models/reviewModel');

const makeError = (code, message, details) => {
    const err = new Error(message);
    err.statusCode = code;
    err.details = details;
    return err;
}


const addReview = async (req, res, next) => {
    const bookId = req.params.id;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
        return next(makeError(400, "Validation Failed", "Rating must be between 1 and 5."));
    }

    try {
        const book = await Book.findOne({ where: { id: bookId, is_deleted: '0' } });
        if (!book) {
            return next(makeError(404, "Book not found"));
        }

        const review = await Review.create({
            userId,
            bookId,
            rating,
            comment
        });

        const createdReview = await Review.findByPk(review.id, {
            include: [{ model: User, attributes: ['name'] }]
        });

        res.status(201).json(createdReview);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return next(makeError(400, "Duplicate Review", "You have already reviewed this book."));
        }
        next(error);
    }
};



const getAllReviews = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return next(makeError(401, "Unauthorized", "Admin access required."));
    }

    const { bookId } = req.query;

    try {
        const filter = {};
        if (bookId) filter.bookId = bookId;

        const reviews = await Review.findAll({
            where: filter,
            include: [
                { model: User, attributes: ['name'] },
                { model: Book, attributes: ['title', 'author'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(reviews);
    } catch (error) {
        next(error);
    }
};

const getReviewsByBook = async (req, res, next) => {
    const bookId  = req.params.id;

    try {
        const book = await Book.findOne({
            where: { 
                id: bookId, 
                is_deleted: '0' 
            }
        });

        if (!book) {
            return next(makeError(404, "Book not found", "The book doesn't exist or has been deleted."));
        }

        const reviews = await Review.findAll({
            where: { bookId },
            include: [{
                model: User,
                attributes: ['name']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(reviews);
    } catch (error) {
        next(error);
    }
};

const deleteReview = async (req, res, next) => {
    const { id } = req.params; 
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const review = await Review.findByPk(id);

        if (!review) {
            return next(makeError(404, "Review not found", `No review exists with ID ${id}`));
        }

        if (userRole !== 'admin' && review.userId !== userId) {
            return next(makeError(403, "Forbidden", "You can only delete your own reviews."));
        }

        await review.destroy();

        res.status(200).json({
            success: true,
            message: "Review deleted successfully."
        });
    } catch (error) {
        next(error);
    }
};


module.exports = { addReview, getAllReviews, getReviewsByBook, deleteReview }