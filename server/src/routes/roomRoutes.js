import express from "express";
import { createRoom, deleteRoom, getAllRooms, getRoomById, updateRoom } from "../controllers/roomController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";

const routerRoom = express.Router();

routerRoom.get("/", getAllRooms);
routerRoom.get("/:id", getRoomById);

routerRoom.post("/", protect, isAdmin, createRoom);
routerRoom.put("/:id", protect, isAdmin, updateRoom);
routerRoom.delete("/:id", protect, isAdmin, deleteRoom);

export default routerRoom;