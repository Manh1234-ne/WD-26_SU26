import express from "express";
import { signIN, signUP, signOut } from "../controllers/authController.js";

const routerAuth = express.Router();

routerAuth.post("/register", signUP);
routerAuth.post("/login", signIN);
routerAuth.post("/logout", signOut);

export default routerAuth