import PricingRule from "../models/PricingRule.js";
import { asyncHandler } from "../utils/asynHandler.js";

const ok = (res, data, message) =>
  res.status(200).json({ success: true, message, data });

const created = (res, data, message = "Tạo thành công") =>
  res.status(201).json({ success: true, message, data });

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

export const getAllRules = asyncHandler(async (req, res) => {
  const rules = await PricingRule.find().sort({ createdAt: -1 });
  return ok(res, rules, "Lấy danh sách quy tắc giá thành công");
});

export const getRuleById = asyncHandler(async (req, res) => {
  const rule = await PricingRule.findById(req.params.id);
  if (!rule) {
    return fail(res, 404, "Không tìm thấy quy tắc giá");
  }
  return ok(res, rule, "Lấy thông tin quy tắc giá thành công");
});

export const createRule = asyncHandler(async (req, res) => {
  const { name, ruleType, surchargePercentage, startTime, endTime, date, endDate, isActive } = req.body;

  if (!name || !ruleType || surchargePercentage === undefined) {
    return fail(res, 400, "Vui lòng cung cấp đủ thông tin tên, loại quy tắc và phần trăm phụ thu");
  }

  if (ruleType === "peak_hour" && (!startTime || !endTime)) {
    return fail(res, 400, "Vui lòng cung cấp giờ bắt đầu và kết thúc cho giờ cao điểm");
  }

  if (ruleType === "holiday" && !date) {
    return fail(res, 400, "Vui lòng cung cấp ngày cho ngày lễ");
  }

  const rule = await PricingRule.create({
    name,
    ruleType,
    surchargePercentage,
    startTime,
    endTime,
    date,
    endDate,
    isActive,
  });

  return created(res, rule, "Tạo quy tắc giá thành công");
});

export const updateRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, ruleType, surchargePercentage, startTime, endTime, date, endDate, isActive } = req.body;

  let rule = await PricingRule.findById(id);
  if (!rule) {
    return fail(res, 404, "Không tìm thấy quy tắc giá");
  }

  if (ruleType === "peak_hour" && (!startTime || !endTime)) {
    return fail(res, 400, "Vui lòng cung cấp giờ bắt đầu và kết thúc cho giờ cao điểm");
  }
  if (ruleType === "holiday" && !date) {
    return fail(res, 400, "Vui lòng cung cấp ngày cho ngày lễ");
  }

  rule.name = name ?? rule.name;
  rule.ruleType = ruleType ?? rule.ruleType;
  rule.surchargePercentage = surchargePercentage ?? rule.surchargePercentage;
  rule.startTime = startTime ?? rule.startTime;
  rule.endTime = endTime ?? rule.endTime;
  rule.date = date ?? rule.date;
  rule.endDate = endDate ?? rule.endDate;
  if (isActive !== undefined) rule.isActive = isActive;

  await rule.save();

  return ok(res, rule, "Cập nhật quy tắc giá thành công");
});

export const deleteRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rule = await PricingRule.findByIdAndDelete(id);

  if (!rule) {
    return fail(res, 404, "Không tìm thấy quy tắc giá");
  }

  return ok(res, null, "Xóa quy tắc giá thành công");
});
