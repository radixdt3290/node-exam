require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const sequelize = require("./config/dbConnection");
const authRouter = require('./routes/auth')
const booksRouter = require('./routes/books')
const ordersRouter = require('./routes/order')
const reviewsRouter = require('./routes/review')
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.use((err, req, res, next) => {

    const statusCode = err.statusCode || 500;
    
    // Map status codes to string codes
    const errorCodes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        422: "VALIDATION_FAILED",
        500: "INTERNAL_SERVER_ERROR"
    };

    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCodes[statusCode] || "ERROR_CODE",
            message: err.message || "An unexpected error occurred"
        }
    });
});
// Start
sequelize.authenticate()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch(err => console.error("DB connection failed:", err.message));
