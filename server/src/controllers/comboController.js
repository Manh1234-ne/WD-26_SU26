import Combo from "../models/Combo.js";
import ComboItem from "../models/ComboItem.js";
import { asyncHandler } from "../utils/asynHandler.js";

const ok = (res, data) =>
  res.status(200).json({ success: true, data });

const created = (res, data, message = "Tạo thành công") =>
  res.status(201).json({ success: true, message, data });

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

/** Lấy danh sách combo kèm nguyên liệu - dùng cho cả client (isActive) và admin (all) */
export const getAllCombos = asyncHandler(async (req, res) => {
  const filter = req.query.admin === "true" ? {} : { isActive: true };
  const combos = await Combo.find(filter).sort({ createdAt: -1 });

  // Gắn ingredients cho từng combo
  const comboIds = combos.map((c) => c._id);
  const items = await ComboItem.find({ combo: { $in: comboIds } }).populate(
    "inventoryItem",
    "name unit"
  );

  const itemsMap = {};
  items.forEach((item) => {
    const id = item.combo.toString();
    if (!itemsMap[id]) itemsMap[id] = [];
    itemsMap[id].push(item);
  });

  const result = combos.map((c) => ({
    ...c.toObject(),
    ingredients: itemsMap[c._id.toString()] || [],
  }));

  return ok(res, result);
});

export const getComboById = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id);

  if (!combo) {
    return fail(res, 404, "Không tìm thấy combo");
  }

  const ingredients = await ComboItem.find({ combo: combo._id }).populate(
    "inventoryItem",
    "name unit stockQuantity"
  );

  return ok(res, { ...combo.toObject(), ingredients });
});

export const createCombo = asyncHandler(async (req, res) => {
  const { name, description, image, price, isActive, ingredients } = req.body;

  if (!name || price === undefined || price === null) {
    return fail(res, 400, "Thiếu thông tin bắt buộc (tên, giá)");
  }

  const combo = await Combo.create({
    name: name.trim(),
    description: description?.trim() || "",
    image: image || "",
    price: Number(price),
    isActive: isActive !== undefined ? isActive : true,
  });

  // Lưu nguyên liệu nếu có
  if (Array.isArray(ingredients) && ingredients.length > 0) {
    const comboItems = ingredients
      .filter((ing) => ing.inventoryItem && ing.quantity > 0)
      .map((ing) => ({
        combo: combo._id,
        inventoryItem: ing.inventoryItem,
        quantity: Number(ing.quantity),
      }));
    if (comboItems.length > 0) {
      await ComboItem.insertMany(comboItems);
    }
  }

  const savedIngredients = await ComboItem.find({ combo: combo._id }).populate(
    "inventoryItem",
    "name unit"
  );

  return created(res, { ...combo.toObject(), ingredients: savedIngredients });
});

export const updateCombo = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id);

  if (!combo) {
    return fail(res, 404, "Không tìm thấy combo");
  }

  if (req.body.name) combo.name = req.body.name.trim();
  if (req.body.description !== undefined) combo.description = req.body.description.trim();
  if (req.body.image !== undefined) combo.image = req.body.image;
  if (req.body.price !== undefined) combo.price = Number(req.body.price);
  if (req.body.isActive !== undefined) combo.isActive = req.body.isActive;

  await combo.save();

  // Cập nhật ingredients nếu được gửi lên
  if (Array.isArray(req.body.ingredients)) {
    await ComboItem.deleteMany({ combo: combo._id });
    const comboItems = req.body.ingredients
      .filter((ing) => ing.inventoryItem && ing.quantity > 0)
      .map((ing) => ({
        combo: combo._id,
        inventoryItem: ing.inventoryItem,
        quantity: Number(ing.quantity),
      }));
    if (comboItems.length > 0) {
      await ComboItem.insertMany(comboItems);
    }
  }

  const ingredients = await ComboItem.find({ combo: combo._id }).populate(
    "inventoryItem",
    "name unit"
  );

  return ok(res, { ...combo.toObject(), ingredients });
});

export const deleteCombo = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id);

  if (!combo) {
    return fail(res, 404, "Không tìm thấy combo");
  }

  combo.isActive = false;
  await combo.save();

  return ok(res, combo);
});