import Room from "../models/Room.js";
import Cinema from "../models/Cinema.js";
import Seat from "../models/Seat.js";
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

export const getAllRooms = asyncHandler(async (req, res) => {
    const { cinema, roomType, isActive } = req.query;

    const query = {};

    if (cinema) query.cinema = cinema;
    if (roomType) query.roomType = roomType;

    if (isActive !== undefined) {
        query.isActive = isActive === "true";
    }

    const rooms = await Room.find(query)
        .populate("cinema", "name city district")
        .sort({ _id: -1 });

    return ok(res, rooms);
});

export const getRoomById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const room = await Room.findById(id)
        .populate("cinema", "name city district");

    if (!room) {
        return fail(res, 404, "không tìm thấy phòng");
    }

    return ok(res, room);
});

export const createRoom = asyncHandler(async (req, res) => {
    const {
        cinema,
        name,
        roomType,
        totalRows,
        seatsPerRow,
        capacity,
    } = req.body;

    if (
        !cinema ||
        !name ||
        !totalRows ||
        !seatsPerRow ||
        !capacity
    ) {
        return fail(res, 400, "vui lòng cung cấp đủ thông tin");
    }

    const cinemaExists = await Cinema.findById(cinema);

    if (!cinemaExists) {
        return fail(res, 404, "không tìm thấy rạp");
    }

    const room = await Room.create({
        cinema,
        name,
        roomType,
        totalRows,
        seatsPerRow,
        capacity,
    });

    return created(res, room);
});

export const updateRoom = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const room = await Room.findById(id);

    if (!room) {
        return fail(res, 404, "không tìm thấy phòng");
    }

    room.name = req.body.name || room.name;
    room.roomType = req.body.roomType || room.roomType;
    room.totalRows = req.body.totalRows || room.totalRows;
    room.seatsPerRow = req.body.seatsPerRow || room.seatsPerRow;
    room.capacity = req.body.capacity || room.capacity;

    if (req.body.isActive !== undefined) {
        room.isActive = req.body.isActive;
    }

    await room.save();

    return ok(res, room);
});

export const deleteRoom = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const room = await Room.findById(id);

    if (!room) {
        return fail(res, 404, "không tìm thấy phòng");
    }

    await Seat.deleteMany({
        room: id,
    });

    await Room.findByIdAndDelete(id);

    return ok(res, room);
});
