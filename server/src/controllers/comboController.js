import Combo from "../models/Combo.js";
import { asyncHandler } from "../utils/asynHandler.js";

const ok = (res, data) =>
  res.status(200).json({
    success: true,
    data,
  });

const created = (res, data, message = "Tạo thành công") =>
  res.status(201).json({
    success: true,
    message,
    data,
  });

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });
export const getAllCombos = asyncHandler(async (req, res) => {
  const combos = await Combo.find({
    isActive: true,
  });

  return ok(res, combos);
});

export const getComboById = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id);

  if (!combo) {
    return fail(res, 404, "Không tìm thấy combo");
  }

  return ok(res, combo);
});
export const createCombo = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    image,
    price,
  } = req.body;

  if (!name || !price) {
    return fail(
      res,
      400,
      "Thiếu thông tin"
    );
  }

  const combo = await Combo.create({
    name,
    description,
    image,
    price,
  });

  return created(res, combo);
});