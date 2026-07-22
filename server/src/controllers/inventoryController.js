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
    const items = await InventoryItem.find({
      isActive: true,
    }).sort({
      name: 1,
    });

    return ok(res, items);
  });
export const getInventoryById =
  asyncHandler(async (req, res) => {
    const item =
      await InventoryItem.findById(
        req.params.id
      );

    if (!item || !item.isActive) {
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
      stockQuantity = 0,
      lowStockThreshold = 10,
    } = req.body;

    if (!name) {
      return fail(
        res,
        400,
        "Tên sản phẩm không được để trống"
      );
    }

    if (stockQuantity < 0) {
      return fail(
        res,
        400,
        "Số lượng tồn kho không hợp lệ"
      );
    }

    const exists =
      await InventoryItem.findOne({
        name: {
          $regex: new RegExp(
            `^${name.trim()}$`,
            "i"
          ),
        },
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
        name: name.trim(),
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

    if (req.body.name) {
      item.name = req.body.name.trim();
    }

    if (req.body.unit) {
      item.unit = req.body.unit;
    }

    if (
      req.body.lowStockThreshold !==
      undefined
    ) {
      item.lowStockThreshold =
        req.body.lowStockThreshold;
    }

    if (
      req.body.isActive !== undefined
    ) {
      item.isActive =
        req.body.isActive;
    }

    await item.save();

    return ok(res, item);
  });
export const restockInventory =
  asyncHandler(async (req, res) => {
    const amount = Number(
      req.body.quantity
    );

    if (
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      return fail(
        res,
        400,
        "Số lượng không hợp lệ"
      );
    }

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

    item.stockQuantity += amount;

    await item.save();

    return ok(res, item);
  });
export const getLowStock =
  asyncHandler(async (req, res) => {
    const items =
      await InventoryItem.find({
        isActive: true,
        $expr: {
          $lte: [
            {
              $subtract: [
                "$stockQuantity",
                "$reservedQuantity",
              ],
            },
            "$lowStockThreshold",
          ],
        },
      }).sort({
        name: 1,
      });

    return ok(res, items);
  });

export const deleteInventory =
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

    item.isActive = false;

    await item.save();

    return ok(res, item);
  });
  export const getAvailableInventory =
  asyncHandler(async (req, res) => {

    const items =
      await InventoryItem.find({
        isActive: true,
      }).sort({
        name: 1,
      });

    const result =
      items.map((item) => ({

        ...item.toObject(),

        availableQuantity:
          item.stockQuantity -
          item.reservedQuantity,

      }));

    return ok(res, result);

  });
  export const getAvailableInventoryById =
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

    return ok(res, {

      ...item.toObject(),

      availableQuantity:
        item.stockQuantity -
        item.reservedQuantity,

    });

  });