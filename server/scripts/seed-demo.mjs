import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import Booking from "../src/models/Booking.js";
import BookingSeat from "../src/models/BookingSeat.js";
import Cinema from "../src/models/Cinema.js";
import Movie from "../src/models/Movie.js";
import Payment from "../src/models/Payment.js";
import Room from "../src/models/Room.js";
import Seat from "../src/models/Seat.js";
import Showtime from "../src/models/Showtime.js";
import User from "../src/models/User.js";
import Voucher from "../src/models/Voucher.js";

const DEMO_PREFIX = "DEMO_";
const DEMO_BOOKING_PREFIX = "DEMO";

const atLocalTime = (dayOffset, hour, minute = 0) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date;
};

const upsert = (Model, filter, values) =>
  Model.findOneAndUpdate(filter, { $set: values }, { upsert: true, returnDocument: "after", runValidators: true });

const cleanupDemoTransactions = async (roomIds) => {
  const showtimes = await Showtime.find({ room: { $in: roomIds } }).select("_id");
  const showtimeIds = showtimes.map((item) => item._id);
  const bookings = await Booking.find({
    $or: [
      { bookingCode: { $regex: `^${DEMO_BOOKING_PREFIX}` } },
      { showtime: { $in: showtimeIds } },
    ],
  }).select("_id");
  const bookingIds = bookings.map((item) => item._id);

  await Promise.all([
    Payment.deleteMany({ booking: { $in: bookingIds } }),
    BookingSeat.deleteMany({ booking: { $in: bookingIds } }),
  ]);
  await Booking.deleteMany({ _id: { $in: bookingIds } });
  await Showtime.deleteMany({ _id: { $in: showtimeIds } });
};

const seed = async () => {
  if (!process.env.MONGO_URI) throw new Error("Thiếu biến môi trường MONGO_URI trong server/.env");
  await mongoose.connect(process.env.MONGO_URI);

  const admin = await User.findOne({ role: "admin", isActive: true });
  if (!admin) throw new Error("Không tìm thấy user admin đang hoạt động");

  const cinema = await upsert(Cinema, { name: `${DEMO_PREFIX}Lumora Central` }, {
    name: `${DEMO_PREFIX}Lumora Central`,
    address: "123 Nguyễn Huệ",
    city: "Hồ Chí Minh",
    district: "Quận 1",
    phone: "0900000000",
    email: "demo-cinema@lumora.test",
    openingTime: "08:00",
    closingTime: "23:30",
    isActive: true,
  });

  const roomDefinitions = [
    { name: `${DEMO_PREFIX}Phòng 1`, roomType: "2D", totalRows: 5, seatsPerRow: 8, capacity: 40 },
    { name: `${DEMO_PREFIX}Phòng VIP`, roomType: "VIP", totalRows: 4, seatsPerRow: 6, capacity: 24 },
    { name: `${DEMO_PREFIX}Phòng IMAX`, roomType: "IMAX", totalRows: 5, seatsPerRow: 8, capacity: 40 },
  ];
  const rooms = [];
  for (const definition of roomDefinitions) {
    rooms.push(await upsert(Room, { name: definition.name }, { ...definition, isActive: true }));
  }

  await cleanupDemoTransactions(rooms.map((room) => room._id));

  const seatsByRoom = new Map();
  for (const room of rooms) {
    const seats = [];
    for (let rowIndex = 0; rowIndex < room.totalRows; rowIndex += 1) {
      const row = String.fromCharCode(65 + rowIndex);
      for (let number = 1; number <= room.seatsPerRow; number += 1) {
        const type = rowIndex >= room.totalRows - 2 ? "vip" : "standard";
        seats.push(await upsert(Seat, { room: room._id, code: `${row}${number}` }, {
          room: room._id,
          row,
          number,
          code: `${row}${number}`,
          type,
          priceMultiplier: type === "vip" ? 1.25 : 1,
          isActive: true,
        }));
      }
    }
    seatsByRoom.set(room._id.toString(), seats);
  }

  const movieDefinitions = [
    { title: `${DEMO_PREFIX}Bão Lửa`, genres: ["Hành động"], duration: 120, ageRating: "T16", director: "Demo Director A" },
    { title: `${DEMO_PREFIX}Mùa Hè Rực Rỡ`, genres: ["Tình cảm", "Hài"], duration: 105, ageRating: "T13", director: "Demo Director B" },
    { title: `${DEMO_PREFIX}Vũ Trụ Bí Ẩn`, genres: ["Khoa học viễn tưởng"], duration: 135, ageRating: "T13", director: "Demo Director C" },
    { title: `${DEMO_PREFIX}Đêm Không Lối Thoát`, genres: ["Kinh dị"], duration: 98, ageRating: "T18", director: "Demo Director D" },
  ];
  const movies = [];
  for (const definition of movieDefinitions) {
    movies.push(await upsert(Movie, { title: definition.title }, {
      ...definition,
      description: `Dữ liệu phim demo phục vụ kiểm thử thống kê cho ${definition.title}.`,
      formats: ["2D", "IMAX"],
      releaseDate: atLocalTime(-30, 0),
      endDate: atLocalTime(45, 23, 59),
      country: "Việt Nam",
      cast: ["Diễn viên Demo 1", "Diễn viên Demo 2"],
      status: "now_showing",
      isActive: true,
    }));
  }

  const password = await bcrypt.hash("Demo@123", 10);
  const customers = [];
  for (let index = 1; index <= 4; index += 1) {
    customers.push(await upsert(User, { email: `demo.customer${index}@lumora.test` }, {
      fullName: `Khách Demo ${index}`,
      email: `demo.customer${index}@lumora.test`,
      password,
      phone: `090000000${index}`,
      role: "customer",
      isActive: true,
    }));
  }

  const voucher = await upsert(Voucher, { code: "DEMO100" }, {
    code: "DEMO100",
    name: "Voucher Demo 100%",
    description: "Voucher biên dùng để kiểm thử mức giảm tối đa 100%.",
    discountType: "percent",
    discountValue: 100,
    maxDiscountAmount: 120000,
    minOrderAmount: 0,
    usageLimit: 100,
    usedCount: 0,
    startDate: atLocalTime(0, 0),
    endDate: atLocalTime(60, 23, 59),
    isActive: true,
  });

  const showtimes = [];
  for (let day = -14; day <= 7; day += 1) {
    const definitions = [
      { hour: 10, room: rooms[0], movie: movies[(day + 28) % movies.length] },
      { hour: 14, room: rooms[1], movie: movies[(day + 29) % movies.length] },
      { hour: 19, room: rooms[0], movie: movies[0] },
      ...(day % 2 === 0 ? [{ hour: 19, room: rooms[2], movie: movies[0] }] : []),
      ...(day % 3 === 0 ? [{ hour: 21, room: rooms[0], movie: movies[1] }] : []),
    ];
    for (const definition of definitions) {
      const startTime = atLocalTime(day, definition.hour);
      const endTime = new Date(startTime.getTime() + definition.movie.duration * 60 * 1000);
      showtimes.push(await Showtime.create({
        movie: definition.movie._id,
        room: definition.room._id,
        cinema: cinema._id,
        startTime,
        endTime,
        format: definition.room.roomType === "IMAX" ? "IMAX" : definition.room.roomType === "VIP" ? "VIP" : "2D",
        language: "Vietnamese",
        subtitle: "Tiếng Việt",
        basePrice: definition.room.roomType === "VIP" ? 120000 : definition.room.roomType === "IMAX" ? 150000 : 85000,
        status: startTime < new Date() ? "closed" : "open",
      }));
    }
  }

  const pastShowtimes = showtimes.filter((showtime) => showtime.startTime < new Date());
  const usedSeatsByShowtime = new Map();
  let printedCount = 0;
  let checkedInCount = 0;
  for (let index = 0; index < Math.min(56, pastShowtimes.length * 2); index += 1) {
    const showtime = pastShowtimes[index % pastShowtimes.length];
    const roomSeats = seatsByRoom.get(showtime.room.toString());
    const used = usedSeatsByShowtime.get(showtime._id.toString()) || new Set();
    const seatCount = (index % 3) + 1;
    const selectedSeats = roomSeats.filter((seat) => !used.has(seat._id.toString())).slice(0, seatCount);
    if (selectedSeats.length === 0) continue;
    selectedSeats.forEach((seat) => used.add(seat._id.toString()));
    usedSeatsByShowtime.set(showtime._id.toString(), used);

    const customer = customers[index % customers.length];
    const totalSeatPrice = selectedSeats.reduce((sum, seat) => sum + showtime.basePrice * seat.priceMultiplier, 0);
    const discountAmount = index % 7 === 0 ? Math.min(totalSeatPrice * 0.1, 50000) : 0;
    const completed = index % 3 !== 0;
    const printed = index % 4 === 0;
    const booking = await Booking.create({
      bookingCode: `${DEMO_BOOKING_PREFIX}${String(index + 1).padStart(5, "0")}`,
      user: customer._id,
      showtime: showtime._id,
      voucher: index === 0 ? voucher._id : undefined,
      totalSeatPrice,
      totalComboPrice: 0,
      discountAmount,
      finalAmount: totalSeatPrice - discountAmount,
      status: completed ? "completed" : "confirmed",
      printStatus: printed ? "printed" : "not_printed",
      printedAt: printed ? new Date(showtime.startTime.getTime() - 45 * 60 * 1000) : undefined,
      printedBy: printed ? admin._id : undefined,
      checkedInAt: completed ? new Date(showtime.startTime.getTime() - 10 * 60 * 1000) : undefined,
      checkedInBy: completed ? admin._id : undefined,
      createdAt: new Date(showtime.startTime.getTime() - 24 * 60 * 60 * 1000),
    });
    if (printed) printedCount += 1;
    if (completed) checkedInCount += 1;

    await BookingSeat.insertMany(selectedSeats.map((seat) => ({
      booking: booking._id,
      showtime: showtime._id,
      seat: seat._id,
      seatCode: seat.code,
      seatType: seat.type,
      price: showtime.basePrice * seat.priceMultiplier,
      status: "booked",
    })));
    await Payment.create({
      booking: booking._id,
      user: customer._id,
      amount: booking.finalAmount,
      method: index % 2 === 0 ? "momo" : "cash",
      status: "paid",
      transactionId: `DEMO-TXN-${String(index + 1).padStart(5, "0")}`,
      paidAt: booking.createdAt,
      note: "Dữ liệu thanh toán demo",
    });
  }

  console.log("Đã tạo dữ liệu demo thành công:");
  console.log(`- 1 rạp, ${rooms.length} phòng, ${[...seatsByRoom.values()].flat().length} ghế`);
  console.log(`- ${movies.length} phim, ${showtimes.length} suất chiếu`);
  console.log(`- ${customers.length} khách hàng (mật khẩu: Demo@123)`);
  console.log(`- ${await Booking.countDocuments({ bookingCode: { $regex: `^${DEMO_BOOKING_PREFIX}` } })} booking`);
  console.log(`- ${printedCount} booking đã in, ${checkedInCount} booking đã soát vé`);
  console.log("- Voucher DEMO100 giảm 100%, tối đa 120.000đ");
};

try {
  await seed();
} catch (error) {
  console.error("Tạo dữ liệu demo thất bại:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
