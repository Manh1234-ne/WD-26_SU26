import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { asyncHandler } from "../utils/asynHandler.js";
import User from "../models/User.js";
const generateToken = (id) => jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: process.env.JWT_EXPIRE || '7d' });

export const signUP = asyncHandler(async (req, res) => {
    if (!req.body) {
        return res.status(400).json({
            success: false,
            message: "vui lòng cung cấp dữ liệu trong body request"
        });
    }
    const { fullName, email, password, phone, dateOfBirth, address } = req.body;
    if (!fullName || !email || !password || !phone) {
        return res.status(400).json({ message: "vui lòng nhập đầy đủ thông tin" });
    }

    const UserExit = await User.findOne({ email });

    if (UserExit) {
        return res.status(400).json({
            message: "tài khoản này đã tồn tại",
            success: false
        })
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        fullName,
        email,
        password: hashedPassword,
        phone,
        dateOfBirth,
        address
    });
    const token = generateToken(user._id);
    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return res.status(201).json({
        success: true,
        token,
        user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            dateOfBirth: user.dateOfBirth,
            address: user.address,
            role: user.role,
        },
        message: "đăng ký thành công"
    })

})
export const signIN = asyncHandler(async (req, res) => {
    if (!req.body) {
        return res.status(400).json({
            success: false,
            message: "vui lòng cung cấp dữ liệu trong body request"
        });
    }
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "nhập đầy đủ thông tin"
        })
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || user.isActive === false) {
        return res.status(401).json({
            message: "tài khoản không tồn tài hoặc đã bị khóa",
            success: false
        })
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({
            message: "mật khẩu không đúng",
            success: false
        })
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(200).json({
        message: "đăng nhập thành công",
        token,
        user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            dateOfBirth: user.dateOfBirth,
            address: user.address,
            role: user.role,
        }
    })

})

export const signOut = asyncHandler(async (req, res) => {
    res.clearCookie("token");
    return res.status(200).json({
        success: true,
        message: "đăng xuất thành công"
    });
})
export const googleSignIn = asyncHandler(async (req, res) => {

})
export const changePassword = asyncHandler(async (req, res) => {

})