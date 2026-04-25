const router = require("express").Router();
const apiAuth = require("../middleware/auth");
const { addReview, getAllReviews, getReviewsByBook, deleteReview } = require("../controller/reviewController");

router.post("/:id", apiAuth, addReview);
router.get("/", apiAuth, getAllReviews);
router.get("/:id", getReviewsByBook);
router.delete("/:id",apiAuth, deleteReview);


module.exports = router