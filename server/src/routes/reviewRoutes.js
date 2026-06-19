import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createReview, deleteReview, getReviewsByMovie, updateReview } from "../controllers/reviewController.js";

const routerReview = express.Router();

routerReview.get("/movie/:movieId",getReviewsByMovie);

routerReview.post("/",protect,createReview);

routerReview.put("/:id",protect,updateReview);

routerReview.delete("/:id",protect,deleteReview);

export default routerReview;