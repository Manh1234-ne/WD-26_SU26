import express from "express";
import { verifyTicket } from "../controllers/ticketController.js";

const ticketRoutes = express.Router();

ticketRoutes.post("/verify", verifyTicket);

export default ticketRoutes;
