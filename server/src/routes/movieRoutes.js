import express from "express";
import {
  createMovie,
  deleteMovie,
  getMovieById,
  getMovies,
  updateMovie,
} from "../controllers/movieController.js";

const routerMovie = express.Router();

routerMovie.route("/").get(getMovies).post(createMovie);
routerMovie.route("/:id").get(getMovieById).put(updateMovie).delete(deleteMovie);

export default routerMovie;
