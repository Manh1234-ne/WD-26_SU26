import express from "express"
import routerMovie from "./movieRoutes.js";
import routerAuth from "./authRoutes.js";
const router = express.Router();

router.use("/movies", routerMovie);
router.use("/auth", routerAuth)
export default router