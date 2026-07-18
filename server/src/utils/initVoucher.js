import Voucher from "../models/Voucher.js";

export const ensureWelcomeVoucher = async () => {
  try {
    const code = "CHAOMUNGNGUOIMOI";
    const existing = await Voucher.findOne({ code });
    if (!existing) {
      await Voucher.create({
        code,
        name: "Chào mừng người mới",
        description: "Giảm 20% cho đơn hàng đầu tiên (tối đa 50k)",
        discountType: "percent",
        discountValue: 20,
        maxDiscountAmount: 50000,
        minOrderAmount: 0,
        usageLimit: 999999, // giới hạn lượt dùng coi như vô hạn
        usedCount: 0,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2036-12-31"), // có hiệu lực trong 10 năm
        isActive: true
      });
      console.log("Khởi tạo voucher chào mừng (CHAOMUNGNGUOIMOI) thành công.");
    }
  } catch (error) {
    console.error("Lỗi khi khởi tạo voucher chào mừng:", error.message);
  }
};
