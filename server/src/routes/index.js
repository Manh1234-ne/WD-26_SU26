import express from "express"
import routerMovie from "./movieRoutes.js";
const router = express();

router.use("/movies", routerMovie);

export default router