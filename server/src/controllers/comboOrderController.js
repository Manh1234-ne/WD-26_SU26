import { asyncHandler } from "../utils/asynHandler.js";
import ComboOrder from "../models/ComboOrder.js";
import Combo from "../models/Combo.js";
import {
  reserveComboStock,
  deductReservedStock,
} from "../services/inventoryService.js";

const ok = (res, data) => res.status(200).json({ success: true, data });
const created = (res, data, message = "Tạo thành công") =>
  res.status(201).json({ success: true, message, data });
const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const generateOrderCode = () => {
  const now = new Date();
  const datePart = [
    now.getFullYear().toString().slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const rand = Math.random().toString(36).toUpperCase().slice(2, 7);
  return `CO-${datePart}-${rand}`;
};

export const createComboOrder = asyncHandler(async (req, res) => {
  const {
    items = [],
    customerName = "Khách vãng lai",
    customerPhone = "",
    paymentMethod = "cash",
    note = "",
  } = req.body;

  // Lấy processedBy từ user đã đăng nhập (nếu có)
  const processedBy = req.user?._id || null;

  if (!items || items.length === 0) {
    return fail(res, 400, "Vui lòng chọn ít nhất 1 sản phẩm");
  }


  const comboIds = items.map((i) => i.combo);
  const combos = await Combo.find({ _id: { $in: comboIds }, isActive: true });

  if (combos.length !== comboIds.length) {
    return fail(res, 400, "Một hoặc nhiều combo không hợp lệ hoặc đã ngừng bán");
  }

  const comboMap = {};
  combos.forEach((c) => { comboMap[c._id.toString()] = c; });

  let totalAmount = 0;
  const resolvedItems = items.map((item) => {
    const combo = comboMap[item.combo.toString()];
    if (!combo) throw new Error(`Không tìm thấy combo ${item.combo}`);
    const qty = item.quantity || 1;
    const unitPrice = combo.price;
    const itemTotal = unitPrice * qty;
    totalAmount += itemTotal;
    return {
      combo: combo._id,
      quantity: qty,
      unitPrice,
      totalPrice: itemTotal,
    };
  });

  // Reserve kho hàng
  try {
    await reserveComboStock(
      resolvedItems.map((i) => ({ combo: i.combo, quantity: i.quantity }))
    );
  } catch (err) {
    return fail(res, 400, err.message || "Không đủ tồn kho");
  }

  // Deduct ngay vì POS là bán trực tiếp (completed luôn)
  try {
    await deductReservedStock(
      resolvedItems.map((i) => ({ combo: i.combo, quantity: i.quantity }))
    );
  } catch (err) {
    console.error("[ComboOrder] deductReservedStock error:", err.message);
  }

  // Tạo orderCode unique
  let orderCode;
  let attempts = 0;
  do {
    orderCode = generateOrderCode();
    attempts++;
    if (attempts > 10) break;
  } while (await ComboOrder.exists({ orderCode }));

  const order = await ComboOrder.create({
    orderCode,
    customerName,
    customerPhone,
    processedBy,
    items: resolvedItems,
    totalAmount,
    paymentMethod,
    status: "completed",
    note,
  });

  const populated = await ComboOrder.findById(order._id).populate("items.combo");

  return created(res, populated, "Tạo đơn bắp nước thành công");
});

/**
 * GET /combo-orders
 * Lấy danh sách đơn bắp nước (admin/staff)
 */
export const getAllComboOrders = asyncHandler(async (req, res) => {
  const orders = await ComboOrder.find()
    .populate("items.combo")
    .populate("processedBy", "fullName email")
    .sort({ createdAt: -1 });
  return ok(res, orders);
});

export const getComboOrderById = asyncHandler(async (req, res) => {
  const order = await ComboOrder.findById(req.params.id)
    .populate("items.combo")
    .populate("processedBy", "fullName email");
  if (!order) return fail(res, 404, "Không tìm thấy đơn hàng");
  return ok(res, order);
});
