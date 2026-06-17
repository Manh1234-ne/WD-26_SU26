import express from "express";
import {
  getAllShowtimes,
  createShowtime,
} from "../controllers/showtimeController.js";

const routerShowtime = express.Router();

routerShowtime.get("/", getAllShowtimes);
routerShowtime.post("/", createShowtime);

export default routerShowtime;