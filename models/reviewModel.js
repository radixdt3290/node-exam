const { DataTypes } = require("sequelize");
const sequelize = require("../config/dbConnection");
const User = require('../models/userModel')
const { Book } = require('../models/bookModel')

const Review = sequelize.define("review", {
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['userId', 'bookId']
        }
    ]
});

// Associations
User.hasMany(Review);
Review.belongsTo(User);

Book.hasMany(Review);
Review.belongsTo(Book);

module.exports = Review