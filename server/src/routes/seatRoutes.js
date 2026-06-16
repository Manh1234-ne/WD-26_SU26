import express from "express";
import { createSeat, deleteSeat, generateSeats, getAllSeats, getSeatById, getSeatsByRoom, updateSeat } from "../controllers/seatController.js";

const routerSeat = express.Router();

routerSeat.get("/", getAllSeats);
routerSeat.get("/room/:roomId", getSeatsByRoom);
routerSeat.get("/:id", getSeatById);

routerSeat.post("/generate/:roomId", generateSeats);
routerSeat.post("/", createSeat);
routerSeat.put("/:id", updateSeat);
routerSeat.delete("/:id", deleteSeat);

export default routerSeat;