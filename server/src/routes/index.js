import express from "express"
import routerMovie from "./movieRoutes.js";
import routerAuth from "./authRoutes.js";
//// Routers category
import categoryRoutes from "./categoryRoutes.js";

const router = express.Router();

router.use("/movies", routerMovie);
router.use("/auth", routerAuth);
// Routers category
router.use("/categories", categoryRoutes);

export default router