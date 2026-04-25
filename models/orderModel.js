const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/dbConnection");
const { Book } = require('../models/bookModel')
const User = require("../models/userModel");


const Order = sequelize.define('order', {
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered'),
        defaultValue: 'pending',
        allowNull: false
    },
    totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Snapshot of total price at time of order'
    }
});


const OrderProduct = sequelize.define('order_product', {
    bookTitleSnapshot: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bookAuthorSnapshot: {
        type: DataTypes.STRING,
        allowNull: false
    },
    unitPriceSnapshot: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 }
    },
    lineTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'unitPriceSnapshot * quantity'
    }
});



const OrderAddress = sequelize.define('order_address', {
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    addressLine1: {
        type: DataTypes.STRING,
        allowNull: false
    },
    addressLine2: {
        type: DataTypes.STRING,
        allowNull: true
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false
    },
    stateProvince: {
        type: DataTypes.STRING,
        allowNull: false
    },
    postalCode: {
        type: DataTypes.STRING,
        allowNull: false
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false
    },
    addressType: {
        type: DataTypes.ENUM('shipping', 'billing'),
        allowNull: false,
        defaultValue: 'shipping'
    }
});



// One User has many Orders
User.hasMany(Order);
Order.belongsTo(User);

// One Order has many snapshots of Books via OrderProducts
Order.hasMany(OrderProduct, { as: 'items' });
OrderProduct.belongsTo(Order);

// One Order has multiple Addresses (Shipping and/or Billing)
Order.hasMany(OrderAddress, { as: 'addresses' });
OrderAddress.belongsTo(Order);

// Optional: Link snapshot back to current Book record (if not deleted)
Book.hasMany(OrderProduct);
OrderProduct.belongsTo(Book);


module.exports = { Order, OrderProduct, OrderAddress }