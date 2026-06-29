import express from "express";
import { createSeat, deleteSeat, generateSeats, getAllSeats, getSeatById, getSeatsByRoom, updateSeat } from "../controllers/seatController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";

const routerSeat = express.Router();

routerSeat.get("/", getAllSeats);
routerSeat.get("/room/:roomId", getSeatsByRoom);
routerSeat.get("/:id", getSeatById);

routerSeat.post("/generate/:roomId", protect, isAdmin, generateSeats);
routerSeat.post("/", protect, isAdmin, createSeat);
routerSeat.put("/:id", protect, isAdmin, updateSeat);
routerSeat.delete("/:id", protect, isAdmin, deleteSeat);

export default routerSeat;