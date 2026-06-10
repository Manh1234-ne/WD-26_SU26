import express from "express";
import { signIN, signUP, signOut, googleSignIn, changePassword } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const routerAuth = express.Router();

routerAuth.post("/signUp", signUP);
routerAuth.post("/signIn", signIN);
routerAuth.post("/signOut", signOut);
routerAuth.post("/google_signIn", googleSignIn)
routerAuth.post("/change_password", protect, changePassword);
export default routerAuth