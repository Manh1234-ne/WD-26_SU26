import express from "express";
import movieController from "../controllers/movieController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";

const router = express.Router();

// GET routes
router.get("/", movieController.getMovies);
router.get("/search", movieController.searchMovies);
router.get("/:id", movieController.getMovieById);

// POST route
router.post("/", protect, isAdmin, movieController.createMovie);

// PUT route
router.put("/:id", protect, isAdmin, movieController.updateMovie);

// DELETE route
router.delete("/:id", protect, isAdmin, movieController.deleteMovie);

export default router;
