const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/dbConnection");

const Book = sequelize.define("books", {
  title: { type: DataTypes.STRING, allowNull: false, unique: true },
  author: { type: DataTypes.STRING, allowNull: false },
  genre: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stockQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue : 0 },
  is_deleted: { type: DataTypes.ENUM('0','1'), defaultValue: '0' },
});



const BookImage = sequelize.define('book_image', {
  originalFileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  storedFileName: {
    type: DataTypes.STRING,
    allowNull: false },
}, {
  updatedAt: false // CreatedAt will serve as the "Upload date"
});

Book.hasMany(BookImage, { foreignKey: 'bookId' });
BookImage.belongsTo(Book, { foreignKey: 'bookId' });


module.exports = { Book, BookImage};
