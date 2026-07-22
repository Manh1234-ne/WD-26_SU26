import User from "../models/User.js";
import { asyncHandler } from "../utils/asynHandler.js";

const ok = (res, data, meta = {}) =>
  res.status(200).json({ success: true, ...meta, data });

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

// GET /api/users — Lấy danh sách tất cả người dùng (admin only)
export const getAllUsers = asyncHandler(async (req, res) => {
  const { role, search, isActive, page = 1, limit = 20 } = req.query;

  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === "true";
  if (search) {
    const regex = new RegExp(search, "i");
    query.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(query),
  ]);

  return ok(res, users, { total, page: Number(page), limit: Number(limit) });
});

// GET /api/users/:id — Lấy chi tiết một user
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return fail(res, 404, "Không tìm thấy người dùng");
  return ok(res, user);
});

// PATCH /api/users/:id/toggle-active — Khoá / mở khoá tài khoản
export const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 404, "Không tìm thấy người dùng");

  // Không cho khoá chính mình
  if (req.user && req.user._id.toString() === user._id.toString()) {
    return fail(res, 400, "Không thể khoá chính tài khoản của mình");
  }

  user.isActive = !user.isActive;
  await user.save();

  return ok(res, { _id: user._id, isActive: user.isActive }, {
    message: user.isActive ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản",
  });
});

// PATCH /api/users/:id/role — Đổi vai trò user
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const validRoles = ["admin", "staff", "customer"];
  if (!validRoles.includes(role)) {
    return fail(res, 400, "Vai trò không hợp lệ");
  }

  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 404, "Không tìm thấy người dùng");

  if (req.user && req.user._id.toString() === user._id.toString()) {
    return fail(res, 400, "Không thể đổi vai trò của chính mình");
  }

  user.role = role;
  await user.save();

  const updated = user.toObject();
  delete updated.password;
  return ok(res, updated, { message: "Cập nhật vai trò thành công" });
});

// DELETE /api/users/:id — Xoá người dùng
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 404, "Không tìm thấy người dùng");

  if (req.user && req.user._id.toString() === user._id.toString()) {
    return fail(res, 400, "Không thể xoá chính tài khoản của mình");
  }

  await User.findByIdAndDelete(req.params.id);
  return ok(res, { _id: user._id }, { message: "Đã xoá người dùng" });
});
