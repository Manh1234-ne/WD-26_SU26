import { asyncHandler } from "../utils/asynHandler.js";
import User from "../models/User.js";

export const isAdmin = asyncHandler(async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                message: "không tìm thấy tài khoản này",
                success: false
            })
        }
        if (user.role !== "admin") {
            return res.status(403).json({
                message: "bạn không có quyền truy cập",
                success: false
            })
        }
        next();
    } catch (error) {
        return res.status(500).json({
            message: "lỗi hệ thống",
            success: false
        })
    }
});