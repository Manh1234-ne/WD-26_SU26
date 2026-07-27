import Room from "../models/Room.js";
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
    const { roomType, isActive } = req.query;

    const query = {};

    if (roomType) query.roomType = roomType;

    if (isActive !== undefined) {
        query.isActive = isActive === "true";
    }

    const rooms = await Room.find(query)
        .sort({ _id: -1 });

    return ok(res, rooms);
});

export const getRoomById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const room = await Room.findById(id);

    if (!room) {
        return fail(res, 404, "không tìm thấy phòng");
    }

    return ok(res, room);
});

export const createRoom = asyncHandler(async (req, res) => {
    const {
        name,
        roomType,
        totalRows,
        seatsPerRow,
        capacity,
    } = req.body;

    if (
        !name ||
        !totalRows ||
        !seatsPerRow ||
        !capacity
    ) {
        return fail(res, 400, "vui lòng cung cấp đủ thông tin");
    }

    const room = await Room.create({
        name,
        roomType,
        totalRows,
        seatsPerRow,
        capacity,
        aisleColumns: req.body.aisleColumns || [],
        aisleRows: req.body.aisleRows || [],
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
    room.aisleColumns = req.body.aisleColumns !== undefined ? req.body.aisleColumns : room.aisleColumns;
    room.aisleRows = req.body.aisleRows !== undefined ? req.body.aisleRows : room.aisleRows;

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
