const router = require("express").Router();
const apiAuth = require("../middleware/auth");
const { createOrder, getAllOrders, getMyOrders, getOrderById, updateOrderStatus } = require("../controller/orderController");

router.post("/", apiAuth, createOrder);
router.get("/", apiAuth, getAllOrders);
router.get("/my", apiAuth, getMyOrders);
router.get("/:id", apiAuth, getOrderById);
router.patch("/:id/status", apiAuth, updateOrderStatus);

module.exports = router