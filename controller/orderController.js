const sequelize = require('../config/dbConnection')
const { Order, OrderProduct, OrderAddress } = require('../models/orderModel');
const { Book } = require('../models/bookModel');



const makeError = (code, message, details) => {
    const err = new Error(message);
    err.statusCode = code;
    err.details = details; // Attach extra data
    return err;
}

const createOrder = async (req, res, next) => {

    const { items, shippingAddress, billingAddress } = req.body;
    const userId = req.user.id;

    // Basic Validation
    if (!items || !items.length || !shippingAddress) {
        return next(makeError(400, "Missing order details", "Items and shipping address are required."));
    }

    // Start Transaction
    const t = await sequelize.transaction();

    try {
        let orderTotal = 0;
        const productsToCreate = [];
        const booksToUpdate = [];

        // Validate all items and take snapshots
        for (const item of items) {
            const book = await Book.findOne({
                where: { id: item.bookId, is_deleted: '0' },
                transaction: t,
                lock: t.LOCK.UPDATE // Prevent other transactions from changing stock while we process
            });

            if (!book) {
                await t.rollback();
                return next(makeError(404, "Book not found", `Book ID ${item.bookId} does not exist.`));
            }

            if (book.stockQuantity < item.quantity) {
                await t.rollback();
                return next(makeError(400, "Insufficient stock", `Not enough stock for "${book.title}".`));
            }

            const lineTotal = parseFloat(book.price) * item.quantity;
            orderTotal += lineTotal;

            // Prepare OrderProduct
            productsToCreate.push({
                bookId: book.id,
                bookTitleSnapshot: book.title,
                bookAuthorSnapshot: book.author,
                unitPriceSnapshot: book.price,
                quantity: item.quantity,
                lineTotal: lineTotal
            });

            // Prepare stock decrement
            booksToUpdate.push({
                book,
                newStock: book.stockQuantity - item.quantity
            });
        }

        // Create Order Record
        const order = await Order.create({
            userId,
            totalPrice: orderTotal,
            status: 'pending'
        }, { transaction: t });

        // Create Order Products
        for (const product of productsToCreate) {
            await OrderProduct.create({ ...product, orderId: order.id }, { transaction: t });
        }

        // Create Addresses Shipping & Billing
        const addresses = [];
        addresses.push({ ...shippingAddress, orderId: order.id, addressType: 'shipping' });
        
        // Use shipping if billing add not present
        const billingData = billingAddress || shippingAddress;
        addresses.push({ ...billingData, orderId: order.id, addressType: 'billing' });

        for (const addr of addresses) {
            await OrderAddress.create(addr, { transaction: t });
        }

        // Update Book Stocks
        for (const update of booksToUpdate) {
            await update.book.update({ stockQuantity: update.newStock }, { transaction: t });
        }

        // Commit everything
        await t.commit();

        // Fetch complete order to return
        const finalOrder = await Order.findByPk(order.id, {
            include: ['items', 'addresses']
        });

        res.status(201).json(finalOrder);

    } catch (error) {
        await t.rollback();
        next(error);
    }
};




const getAllOrders = async (req, res, next) => {
    // Restrict access to admins
    if (!req.user || req.user.role !== 'admin') {
        return next(makeError(401, "Unauthorized", "Admin access required."));
    }

    try {
        // Fetch every order, items and addresses
        const orders = await Order.findAll({
            include: [
                {
                    model: OrderProduct,
                    as: 'items'
                },
                {
                    model: OrderAddress,
                    as: 'addresses'
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
            success: true,
            data: orders
        });

    } catch (error) {
        next(error);
    }
};


const getMyOrders = async (req, res, next) => {
    try {
        // Find orders matching the logged-in user's ID
        const orders = await Order.findAll({
            where: { userId: req.user.id },
            include: [
                {
                    model: OrderProduct,
                    as: 'items'
                },
                {
                    model: OrderAddress,
                    as: 'addresses'
                }
            ],
            // Most recent orders at the top
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};


const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Fetch order with related products and addresses
        const order = await Order.findByPk(id, {
            include: [
                { model: OrderProduct, as: 'items' },
                { model: OrderAddress, as: 'addresses' }
            ]
        });

        // Error if order doesn't exist
        if (!order) {
            return next(makeError(404, "Order not found", `No order with ID ${id}`));
        }

        // Block customers from viewing orders that aren't theirs
        if (userRole !== 'admin' && order.userId !== userId) {
            return next(makeError(403, "Forbidden", "You do not have permission to view this order."));
        }

        return res.status(200).json(order);
    } catch (error) {
        next(error);
    }
};


const updateOrderStatus = async (req, res, next) => {
    // Restrict to admins
    if (!req.user || req.user.role !== 'admin') {
        return next(makeError(401, "Unauthorized", "Admin access required."));
    }

    const { id } = req.params;
    const { status } = req.body;

    // Allowed status list
    const allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered'];

    try {
        // Validate input status
        if (!allowedStatuses.includes(status)) {
            return next(makeError(400, "Invalid status", `Status must be one of: ${allowedStatuses.join(', ')}`));
        }

        // Find the order
        const order = await Order.findByPk(id);

        if (!order) {
            return next(makeError(404, "Order not found", `No order with ID ${id}`));
        }

        // Update status field
        await order.update({ status });

        // Reload with all associations for the response
        const updatedOrder = await Order.findByPk(id, {
            include: [
                { model: OrderProduct, as: 'items' },
                { model: OrderAddress, as: 'addresses' }
            ]
        });

        return res.status(200).json(updatedOrder);
    } catch (error) {
        next(error);
    }
};



module.exports = { createOrder, getAllOrders, getMyOrders, getOrderById, updateOrderStatus }