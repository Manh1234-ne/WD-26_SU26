import Seat from "../models/Seat.js";
import Room from "../models/Room.js";
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

seat.row = req.body.row
? req.body.row.toUpperCase()
: seat.row;

seat.number = req.body.number || seat.number;

seat.code = req.body.code
? req.body.code.toUpperCase()
: seat.code;

seat.type = req.body.type || seat.type;

seat.priceMultiplier =
req.body.priceMultiplier !== undefined
? req.body.priceMultiplier
: seat.priceMultiplier;

if (req.body.isActive !== undefined) {
seat.isActive = req.body.isActive;
}

await seat.save();

return ok(res, seat);
});

export const deleteSeat = asyncHandler(async (req, res) => {
const { id } = req.params;

const seat = await Seat.findById(id);

if (!seat) {
return fail(res, 404, "không tìm thấy ghế");
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
