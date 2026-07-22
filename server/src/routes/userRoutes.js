import express from "express";
import {
  getAllUsers,
  getUserById,
  toggleUserActive,
  updateUserRole,
  deleteUser,
} from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

const routerUser = express.Router();

// Tất cả route user cần đăng nhập (admin tự check ở frontend hoặc thêm middleware)
routerUser.use(protect);

routerUser.get("/", getAllUsers);
routerUser.get("/:id", getUserById);
routerUser.patch("/:id/toggle-active", toggleUserActive);
routerUser.patch("/:id/role", updateUserRole);
routerUser.delete("/:id", deleteUser);

export default routerUser;
