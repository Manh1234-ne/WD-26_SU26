import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { asyncHandler } from "../utils/asynHandler.js";
import User from "../models/User.js";
const generateToken = (id) => jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: process.env.JWT_EXPIRE || '7d' });
const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
)
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
    const token = req.body.token;

    if (!token) {
        return res.status(400).json({ message: "không tìm thấy token" });
    }

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
        return res.status(400).json({
            success: false,
            message: "không tìm thấy thông tin google"
        });
    }

    const { email, name, picture } = payload;
    if (!email) {
        return res.status(400).json({
            success: false,
            message: "không tìm thấy email"
        });
    }

    let user = await User.findOne({ email });
    if (!user) {
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        user = await User.create({
            fullName: name,
            email,
            password: hashedPassword,
            avatar: picture
        });
    } else if (user.isActive === false) {
        return res.status(401).json({
            success: false,
            message: "tài khoản đã bị khóa"
        });
    }

    const jwtToken = generateToken(user._id);

    res.cookie("token", jwtToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
        success: true,
        message: "đăng nhập Google thành công",
        token: jwtToken,
        user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            dateOfBirth: user.dateOfBirth,
            address: user.address,
            role: user.role,
        }
    });
});

export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Vui lòng truyền đủ currentPassword và newPassword" });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "không tìm thấy người dùng"
        });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: "mật khẩu cũ không đúng"
        });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    return res.status(200).json({
        success: true,
        message: "cập nhật mật khẩu thành công"
    });
});

export const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            message: "không tìm thấy người dùng"
        })
    }
    return res.status(200).json({
        success: true,
        user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            address: user.address
        }
    })
});

export const updateProfile = asyncHandler(async (req, res) => {
    const { fullName, phone, address, dateOfBirth } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({
            message: "không tìm thấy người dùng"
        })
    }
    user.fullName = fullName;
    user.phone = phone;
    user.address = address;
    user.dateOfBirth = dateOfBirth;
    await user.save();
    return res.status(200).json({
        success: true,
        message: "cập nhật thông tin thành công"
    })
})