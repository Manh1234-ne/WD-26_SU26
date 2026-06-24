import express from "express";
import {
  getAllShowtimes,
  createShowtime,
  getShowtimeById,
  updateShowtime,
  deleteShowtime,
} from "../controllers/showtimeController.js";

const routerShowtime = express.Router();

routerShowtime.get("/", getAllShowtimes);
routerShowtime.post("/", createShowtime);
routerShowtime.get("/:id", getShowtimeById);
routerShowtime.put("/:id", updateShowtime);
routerShowtime.delete("/:id", deleteShowtime);

export default routerShowtime;