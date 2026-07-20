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

  export const createInventory =
  asyncHandler(async (req, res) => {
    const {
      name,
      unit,
      stockQuantity,
      lowStockThreshold,
    } = req.body;

    if (!name) {
      return fail(
        res,
        400,
        "Tên sản phẩm không được để trống"
      );
    }

    const exists =
      await InventoryItem.findOne({
        name,
      });

    if (exists) {
      return fail(
        res,
        400,
        "Sản phẩm đã tồn tại"
      );
    }

    const item =
      await InventoryItem.create({
        name,
        unit,
        stockQuantity,
        lowStockThreshold,
      });

    return created(
      res,
      item,
      "Tạo sản phẩm thành công"
    );
  });

  export const updateInventory =
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

    item.name =
      req.body.name || item.name;

    item.unit =
      req.body.unit || item.unit;

    item.lowStockThreshold =
      req.body.lowStockThreshold ??
      item.lowStockThreshold;

    item.isActive =
      req.body.isActive ??
      item.isActive;

    await item.save();

    return ok(res, item);
  });
