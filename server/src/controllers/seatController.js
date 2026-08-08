import Seat from "../models/Seat.js";
import Room from "../models/Room.js";
import BookingSeat from "../models/BookingSeat.js";
import { asyncHandler } from "../utils/asynHandler.js";

const ok = (res, data, meta = {}) =>
  res.status(200).json({
    success: true,
    ...meta,
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

export const getAllSeats = asyncHandler(async (req, res) => {
  const { room, type, isActive } = req.query;

  const query = {};

  if (room) query.room = room;
  if (type) query.type = type;

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const seats = await Seat.find(query)
    .populate({
      path: "room",
      select: "name roomType totalRows seatsPerRow capacity",
    })
    .sort({
      row: 1,
      number: 1,
    });

  return ok(res, seats);
});

export const getSeatById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const seat = await Seat.findById(id).populate({
    path: "room",
    select: "name roomType totalRows seatsPerRow capacity",
  });

  if (!seat) {
    return fail(res, 404, "không tìm thấy ghế");
  }

  return ok(res, seat);
});

export const getSeatsByRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    return fail(res, 404, "không tìm thấy phòng");
  }

  const seats = await Seat.find({
    room: roomId,
  }).sort({
    row: 1,
    number: 1,
  });

  return ok(res, {
    room,
    seats,
  });
});

export const createSeat = asyncHandler(async (req, res) => {
  const {
    room,
    row,
    number,
    code,
    type,
    priceMultiplier,
  } = req.body;

  if (!room || !row || !number || !code) {
    return fail(res, 400, "vui lòng cung cấp đủ thông tin");
  }

  const roomExists = await Room.findById(room);

  if (!roomExists) {
    return fail(res, 404, "không tìm thấy phòng");
  }

  const existingSeat = await Seat.findOne({
    room,
    code: code.toUpperCase(),
  });

  if (existingSeat) {
    return fail(res, 400, "ghế đã tồn tại trong phòng");
  }

  const seat = await Seat.create({
    room,
    row: row.toUpperCase(),
    number,
    code: code.toUpperCase(),
    type,
    priceMultiplier,
  });

  return created(res, seat);
});

export const updateSeat = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const seat = await Seat.findById(id);

  if (!seat) {
    return fail(res, 404, "không tìm thấy ghế");
  }

  const bookings = await BookingSeat.find({ seat: id, status: { $in: ["held", "booked"] } }).populate("showtime");
  const now = new Date();
  const hasUpcomingBooking = bookings.some(b => {
    return b.showtime && new Date(b.showtime.endTime) >= now;
  });

  if (hasUpcomingBooking) {
    return fail(res, 400, "Ghế này đã có người đặt vé trong lịch chiếu sắp diễn ra hoặc đang chiếu, không thể thay đổi thông tin hay trạng thái");
  }

  const oldType = seat.type;
  const newType = req.body.type || seat.type;

  seat.row = req.body.row
    ? req.body.row.toUpperCase()
    : seat.row;

  seat.number = req.body.number || seat.number;

  // If we are splitting a couple seat
  if (oldType === 'couple' && newType !== 'couple') {
    seat.code = `${seat.row}${seat.number}`;
    seat.type = newType;

    seat.priceMultiplier =
      req.body.priceMultiplier !== undefined
        ? req.body.priceMultiplier
        : 1;

    if (req.body.isActive !== undefined) {
      seat.isActive = req.body.isActive;
    }

    await seat.save();

    // Create the second seat
    await Seat.create({
      room: seat.room,
      row: seat.row,
      number: seat.number + 1,
      code: `${seat.row}${seat.number + 1}`,
      type: newType,
      priceMultiplier: seat.priceMultiplier,
      isActive: seat.isActive,
    });
  } else {
    seat.code = req.body.code
      ? req.body.code.toUpperCase()
      : seat.code;

    seat.type = newType;

    seat.priceMultiplier =
      req.body.priceMultiplier !== undefined
        ? req.body.priceMultiplier
        : seat.priceMultiplier;

    if (req.body.isActive !== undefined) {
      seat.isActive = req.body.isActive;
    }

    await seat.save();
  }

  return ok(res, seat);
});

export const deleteSeat = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const seat = await Seat.findById(id);

  if (!seat) {
    return fail(res, 404, "không tìm thấy ghế");
  }

  const isBooked = await BookingSeat.findOne({ seat: id, status: { $in: ["held", "booked"] } });

  if (isBooked) {
    return fail(res, 400, "Ghế này đã từng  có người đặt, không thể xóa");
  }

  await Seat.findByIdAndDelete(id);

  return ok(res, seat);
});

export const generateSeats = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);
  if (!room) {
    return fail(res, 404, "không tìm thấy phòng");
  }

  const existedSeats = await Seat.countDocuments({
    room: roomId,
  });

  if (existedSeats > 0) {
    return fail(
      res,
      400,
      "phòng đã có ghế, không thể tạo tự động"
    );
  }

  const seats = [];

  for (let i = 0; i < room.totalRows; i++) {
    const row = String.fromCharCode(65 + i);

    for (let j = 1; j <= room.seatsPerRow; j++) {
      seats.push({
        room: room._id,
        row,
        number: j,
        code: `${row}${j}`,
        type: "standard",
        priceMultiplier: 1,
      });
    }
  }

  const createdSeats = await Seat.insertMany(seats);

  return created(
    res,
    createdSeats,
    `Đã tạo ${createdSeats.length} ghế thành công`
  );
});

export const mergeCoupleSeats = asyncHandler(async (req, res) => {
  const { seatId1, seatId2 } = req.body;

  if (!seatId1 || !seatId2) {
    return fail(res, 400, "Vui lòng chọn 2 ghế để ghép");
  }

  const seat1 = await Seat.findById(seatId1);
  const seat2 = await Seat.findById(seatId2);

  if (!seat1 || !seat2) {
    return fail(res, 404, "Không tìm thấy ghế");
  }

  if (seat1.type === 'couple' || seat2.type === 'couple') {
    return fail(res, 400, "Không thể ghép các ghế đã là ghế đôi (Couple)");
  }

  if (seat1.room.toString() !== seat2.room.toString() || seat1.row !== seat2.row) {
    return fail(res, 400, "2 ghế phải cùng phòng và cùng hàng");
  }

  const isBooked1 = await BookingSeat.findOne({ seat: seatId1, status: { $in: ["held", "booked"] } });
  const isBooked2 = await BookingSeat.findOne({ seat: seatId2, status: { $in: ["held", "booked"] } });

  if (isBooked1 || isBooked2) {
    return fail(res, 400, "Một trong hai ghế đã từng có người đặt, không  thể ghép");
  }

  // Define which one comes first in physical position
  const firstSeat = seat1.number < seat2.number ? seat1 : seat2;
  const secondSeat = seat1.number < seat2.number ? seat2 : seat1;

  if (Math.abs(secondSeat.number - firstSeat.number) !== 1) {
    return fail(res, 400, "2 ghế phải liền kề nhau");
  }

  const room = await Room.findById(firstSeat.room);
  if (room && room.aisles) {
    const parsedAisles = room.aisles.split(',').map(Number);
    if (parsedAisles.includes(firstSeat.number)) {
      return fail(res, 400, "Không thể ghép 2 ghế nằm ở 2 bên lối đi");
    }
  }

  // Update first seat to couple
  firstSeat.type = "couple";
  firstSeat.priceMultiplier = 2;
  firstSeat.code = `${firstSeat.row}${firstSeat.number}-${secondSeat.number}`;
  await firstSeat.save();

  // Delete second seat
  await Seat.findByIdAndDelete(secondSeat._id);

  return ok(res, firstSeat);
});
