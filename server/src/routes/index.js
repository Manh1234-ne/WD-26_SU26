import express from "express"
import routerMovie from "./movieRoutes.js";
import routerAuth from "./authRoutes.js";
import routerCinema from "./cinemaRoutes.js";
const router = express.Router();

router.use("/movies", routerMovie);
router.use("/auth", routerAuth);
router.use('/cinemas', routerCinema);
export default router