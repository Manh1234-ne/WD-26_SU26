//
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asynHandler.js";
export const protect = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.token
        || req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    }
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
        return res.status(401).json({ success: false, message: "Token không hợp lệ hoặc tài khoản bị khoá" });
    }
    req.user = user;
    next();
});