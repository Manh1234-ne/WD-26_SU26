import express from "express";
import { getAllBookingSeats, getBookingSeatById, getBookingSeatsByShowtime, getOccupiedSeats } from "../controllers/bookingSeatController.js";


const routerBookingSeat = express.Router();

routerBookingSeat.get("/", getAllBookingSeats);

routerBookingSeat.get("/showtime/:showtimeId", getBookingSeatsByShowtime);

routerBookingSeat.get("/showtime/:showtimeId/occupied", getOccupiedSeats);

routerBookingSeat.get("/:id", getBookingSeatById);

export default routerBookingSeat;