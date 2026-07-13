import mongoose from "mongoose";
import dotenv from "dotenv";
import Booking from "./src/models/Booking.js";
import Voucher from "./src/models/Voucher.js";
import User from "./src/models/User.js";
import { ensureWelcomeVoucher } from "./src/utils/initVoucher.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/WD-26_SU26";

async function run() {
  console.log("Đang kết nối MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Kết nối thành công!");

  // Gọi hàm ensureWelcomeVoucher để khởi tạo voucher vào database
  console.log("Đang seeding voucher chào mừng...");
  await ensureWelcomeVoucher();

  // Tạo một tài khoản người dùng hoàn toàn mới để đảm bảo chưa từng đặt vé
  const randomEmail = `newuser_${Date.now()}@example.com`;
  const user = await User.create({
    fullName: "Người dùng mới",
    email: randomEmail,
    password: "password123",
    role: "customer"
  });
  console.log("Đã tạo người dùng test mới:", user.email);

  // Kịch bản 1: Áp dụng voucher chào mừng cho đơn đặt vé đầu tiên (Thành công)
  const booking1 = await Booking.create({
    bookingCode: "BKWELCOME1_" + Date.now(),
    user: user._id,
    showtime: new mongoose.Types.ObjectId(),
    totalSeatPrice: 100000,
    finalAmount: 100000,
    status: "pending",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  console.log("Đã tạo Booking 1 (Chờ thanh toán) cho người dùng mới");

  console.log("Kịch bản 1: Áp dụng voucher CHAOMUNGNGUOIMOI cho Booking 1...");
  const res1 = await fetch(`http://localhost:5000/api/bookings/${booking1._id}/apply-voucher`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voucherCode: "CHAOMUNGNGUOIMOI" })
  });

  const data1 = await res1.json();
  console.log("Kết quả áp dụng Booking 1:", res1.status, data1.message || "Thành công");
  if (!data1.success) {
    throw new Error("Kỳ vọng voucher CHAOMUNGNGUOIMOI áp dụng thành công cho đơn đầu tiên");
  }
  console.log("✓ Kịch bản 1 thành công: Người dùng mới áp dụng được voucher chào mừng.");

  // Xác nhận booking1 để giả lập thanh toán thành công
  booking1.status = "confirmed";
  booking1.voucher = data1.data.voucher._id;
  booking1.discountAmount = data1.data.discountAmount;
  booking1.finalAmount = data1.data.finalAmount;
  await booking1.save();
  console.log("Giả lập Booking 1 thanh toán thành công: status -> confirmed");

  // Kịch bản 2: Cố gắng áp dụng voucher chào mừng cho đơn thứ hai của cùng user (Thất bại)
  const booking2 = await Booking.create({
    bookingCode: "BKWELCOME2_" + Date.now(),
    user: user._id,
    showtime: new mongoose.Types.ObjectId(),
    totalSeatPrice: 150000,
    finalAmount: 150000,
    status: "pending",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  console.log("Đã tạo Booking 2 (Chờ thanh toán) cho cùng người dùng");

  console.log("Kịch bản 2: Áp dụng voucher CHAOMUNGNGUOIMOI cho Booking 2 (kỳ vọng thất bại)...");
  const res2 = await fetch(`http://localhost:5000/api/bookings/${booking2._id}/apply-voucher`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voucherCode: "CHAOMUNGNGUOIMOI" })
  });

  const data2 = await res2.json();
  console.log("Kết quả áp dụng Booking 2:", res2.status, data2.message);
  if (res2.status !== 400 || data2.success) {
    throw new Error("Kỳ vọng áp dụng voucher cho Booking 2 thất bại với mã lỗi 400");
  }
  console.log("✓ Kịch bản 2 thành công: Đã chặn áp dụng voucher chào mừng cho đơn thứ hai.");

  // Kịch bản 3: Kiểm tra giới hạn 1 tài khoản chỉ được dùng 1 lần đối với voucher thông thường.
  // Tạo một voucher thông thường (LIMITVOUCHER)
  let testVoucher = await Voucher.findOne({ code: "LIMITVOUCHER" });
  if (!testVoucher) {
    testVoucher = await Voucher.create({
      code: "LIMITVOUCHER",
      name: "Voucher giới hạn lượt dùng test",
      description: "Giảm 10k",
      discountType: "fixed",
      discountValue: 10000,
      minOrderAmount: 0,
      usageLimit: 10,
      usedCount: 0,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2036-12-31"),
      isActive: true
    });
  }

  // Áp dụng LIMITVOUCHER cho Booking 2 (Lần đầu tiên của user đối với voucher này). Thành công.
  console.log("Kịch bản 3: Áp dụng voucher thông thường cho Booking 2 lần đầu tiên...");
  const res3 = await fetch(`http://localhost:5000/api/bookings/${booking2._id}/apply-voucher`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voucherCode: "LIMITVOUCHER" })
  });
  const data3 = await res3.json();
  console.log("Kết quả áp dụng voucher thông thường cho Booking 2:", res3.status, data3.message || "Thành công");
  if (!data3.success) {
    throw new Error("Kỳ vọng voucher LIMITVOUCHER áp dụng thành công");
  }

  // Xác nhận booking2 thanh toán thành công
  booking2.status = "confirmed";
  booking2.voucher = testVoucher._id;
  booking2.discountAmount = data3.data.discountAmount;
  booking2.finalAmount = data3.data.finalAmount;
  await booking2.save();
  console.log("Giả lập Booking 2 thanh toán thành công: status -> confirmed");

  // Tạo Booking 3 và cố gắng áp dụng tiếp LIMITVOUCHER (Kỳ vọng thất bại do mỗi tài khoản chỉ được dùng 1 lần)
  const booking3 = await Booking.create({
    bookingCode: "BKTEST3_" + Date.now(),
    user: user._id,
    showtime: new mongoose.Types.ObjectId(),
    totalSeatPrice: 100000,
    finalAmount: 100000,
    status: "pending",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  console.log("Đã tạo Booking 3 (Chờ thanh toán)");

  console.log("Kịch bản 4: Áp dụng tiếp LIMITVOUCHER cho Booking 3 (kỳ vọng thất bại)...");
  const res4 = await fetch(`http://localhost:5000/api/bookings/${booking3._id}/apply-voucher`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voucherCode: "LIMITVOUCHER" })
  });
  const data4 = await res4.json();
  console.log("Kết quả áp dụng Booking 3:", res4.status, data4.message);
  if (res4.status !== 400 || data4.success) {
    throw new Error("Kỳ vọng trùng lặp voucher LIMITVOUCHER sẽ bị từ chối");
  }
  console.log("✓ Kịch bản 4 thành công: Giới hạn lượt sử dụng voucher thông thường hoạt động chính xác.");

  // Dọn dẹp dữ liệu kiểm thử
  console.log("Đang dọn dẹp dữ liệu test...");
  await Booking.deleteMany({ user: user._id });
  await User.deleteOne({ _id: user._id });
  await Voucher.deleteOne({ code: "LIMITVOUCHER" });
  console.log("Hoàn tất!");
}

run()
  .catch(err => {
    console.error("Kiểm thử thất bại:", err);
  })
  .finally(() => {
    mongoose.disconnect();
  });
