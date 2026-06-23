import Voucher from "../models/Voucher.js";
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

export const getAllVouchers = asyncHandler(
  async (req, res) => {
    const vouchers = await Voucher.find()
      .sort({ createdAt: -1 });

    return ok(res, vouchers);
  }
);

export const getVoucherById = asyncHandler(
  async (req, res) => {
    const voucher = await Voucher.findById(
      req.params.id
    );

    if (!voucher) {
      return fail(
        res,
        404,
        "Không tìm thấy voucher"
      );
    }

    return ok(res, voucher);
  }
);

export const createVoucher = asyncHandler(
  async (req, res) => {
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      usageLimit,
      startDate,
      endDate,
    } = req.body;

    const existingVoucher =
      await Voucher.findOne({
        code: code.toUpperCase(),
      });

    if (existingVoucher) {
      return fail(
        res,
        400,
        "Mã voucher đã tồn tại"
      );
    }

    const voucher = await Voucher.create({
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      usageLimit,
      startDate,
      endDate,
    });

    return created(res, voucher);
  }
);

export const updateVoucher = asyncHandler(
  async (req, res) => {
    const voucher =
      await Voucher.findById(
        req.params.id
      );

    if (!voucher) {
      return fail(
        res,
        404,
        "Không tìm thấy voucher"
      );
    }

    Object.assign(voucher, req.body);

    await voucher.save();

    return ok(res, voucher);
  }
);

export const deleteVoucher = asyncHandler(
  async (req, res) => {
    const voucher =
      await Voucher.findByIdAndDelete(
        req.params.id
      );

    if (!voucher) {
      return fail(
        res,
        404,
        "Không tìm thấy voucher"
      );
    }

    return ok(res, {
      message:
        "Xóa voucher thành công",
    });
  }
);

export const validateVoucher =
  asyncHandler(async (req, res) => {
    const {
      code,
      orderAmount,
    } = req.body;

    const voucher =
      await Voucher.findOne({
        code: code.toUpperCase(),
        isActive: true,
      });

    if (!voucher) {
      return fail(
        res,
        404,
        "Voucher không tồn tại"
      );
    }

    const now = new Date();

    if (now < voucher.startDate) {
      return fail(
        res,
        400,
        "Voucher chưa bắt đầu"
      );
    }

    if (now > voucher.endDate) {
      return fail(
        res,
        400,
        "Voucher đã hết hạn"
      );
    }

    if (
      voucher.usageLimit &&
      voucher.usedCount >=
        voucher.usageLimit
    ) {
      return fail(
        res,
        400,
        "Voucher đã hết lượt sử dụng"
      );
    }

    if (
      orderAmount <
      voucher.minOrderAmount
    ) {
      return fail(
        res,
        400,
        `Đơn hàng tối thiểu ${voucher.minOrderAmount}`
      );
    }

    let discountAmount = 0;

    if (
      voucher.discountType ===
      "percent"
    ) {
      discountAmount =
        (orderAmount *
          voucher.discountValue) /
        100;

      if (
        voucher.maxDiscountAmount
      ) {
        discountAmount =
          Math.min(
            discountAmount,
            voucher.maxDiscountAmount
          );
      }
    } else {
      discountAmount =
        voucher.discountValue;
    }

    return ok(res, {
      voucher,
      discountAmount,
      finalAmount:
        orderAmount -
        discountAmount,
    });
  });