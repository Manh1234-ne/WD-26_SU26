import express from "express";
import movieController from "../controllers/movieController.js";

const router = express.Router();

// GET routes
router.get("/", movieController.getMovies);
router.get("/search", movieController.searchMovies);
router.get("/:id", movieController.getMovieById);

// POST route
router.post("/", movieController.createMovie);

// PUT route
router.put("/:id", movieController.updateMovie);

// DELETE route
router.delete("/:id", movieController.deleteMovie);

export default router;
