import express from "express";
import { createRoom, deleteRoom, getAllRooms, getRoomById, updateRoom } from "../controllers/roomController.js";

const routerRoom = express.Router();

routerRoom.get("/", getAllRooms);
routerRoom.get("/:id", getRoomById);

routerRoom.post("/", createRoom);
routerRoom.put("/:id", updateRoom);
routerRoom.delete("/:id", deleteRoom);

export default routerRoom;