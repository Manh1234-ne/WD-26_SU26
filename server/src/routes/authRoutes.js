import express from "express";
import { signIN, signUP, signOut } from "../controllers/authController.js";

const routerAuth = express.Router();

routerAuth.post("/signUp", signUP);
routerAuth.post("/signIn", signIN);
routerAuth.post("/signOut", signOut);

export default routerAuth