import InventoryItem from "../models/InventoryItem.js";
import { asyncHandler } from "../utils/asynHandler.js";

const ok = (res, data) =>
  res.status(200).json({
    success: true,
    data,
  });

const created = (
  res,
  data,
  message = "Tạo thành công"
) =>
  res.status(201).json({
    success: true,
    message,
    data,
  });

const fail = (
  res,
  status,
  message
) =>
  res.status(status).json({
    success: false,
    message,
  });
export const getAllInventory =
  asyncHandler(async (req, res) => {
    const items =
      await InventoryItem.find()
        .sort({ name: 1 });

    return ok(res, items);
  });


export const getInventoryById =
  asyncHandler(async (req, res) => {
    const item =
      await InventoryItem.findById(
        req.params.id
      );

    if (!item) {
      return fail(
        res,
        404,
        "Không tìm thấy sản phẩm"
      );
    }

    return ok(res, item);
  });