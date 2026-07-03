import express from "express";
import {
  getAllShowtimes,
  createShowtime,
  getShowtimeById,
  updateShowtime,
  deleteShowtime,
} from "../controllers/showtimeController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";

const routerShowtime = express.Router();
routerShowtime.get("/:id", getShowtimeById);
routerShowtime.get("/", getAllShowtimes);

routerShowtime.post("/", protect, isAdmin, createShowtime);
routerShowtime.put("/:id", protect, isAdmin, updateShowtime);
routerShowtime.delete("/:id", protect, isAdmin, deleteShowtime);

export default routerShowtime;