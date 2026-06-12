import Cinema from '../models/Cinema.js';
import Room from '../models/Room.js';
import Showtime from '../models/Showtime.js';
import Booking from '../models/Booking.js';
import { asyncHandler } from '../utils/asynHandler.js';

const paginate = (page = 1, limit = 10) => {
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.max(parseInt(limit) || 10, 1);
    const safeLimit = Math.min(parsedLimit, 100);
    return {
        limit: safeLimit,
        offset: (parsedPage - 1) * safeLimit
    };
};


const ok = (res, data, meta = {}) => res.status(200).json({ success: true, ...meta, data });
const created = (res, data, message = 'Tạo thành công') => res.status(201).json({ success: true, message, data });
const fail = (res, status, message) => res.status(status).json({ success: false, message });

export const getAllCinemas = asyncHandler(async (req, res) => {
    const {
        isActive,
        city,
        district,
        limit = 10,
        page = 1
    } = req.query;

    const query = {};

    if (city) query.city = city;
    if (district) query.district = district;

    if (isActive !== undefined) {
        query.isActive = isActive === "true";
    }

    const { limit: pageSize, offset } = paginate(page, limit);

    const total = await Cinema.countDocuments(query);

    const cinemas = await Cinema.find(query)
        .populate({
            path: "rooms",
            match: { isActive: true },
            select: "name totalRows seatsPerRow capacity"
        })
        .skip(offset)
        .limit(pageSize)
        .sort({ _id: -1 });

    return ok(res, {
        cinemas,
        pagination: {
            page: Number(page),
            limit: pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
        }
    });
});

export const getCinemaById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cinema = await Cinema.findById(id);

    if (!cinema) {
        return fail(res, 404, "không tìm thấy rạp")
    }

    return ok(res, cinema);
});

export const getCities = asyncHandler(async (req, res) => {
    const cities = await Cinema.distinct("city");

    return ok(res, cities);

});
export const getCinemaShowtimes = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;
    const cinema = await Cinema.findById(id);

    if (!cinema) {
        return fail(res, 404, "không tìm thấy rạp")
    }

    let startDate = new Date();
    let endDate = new Date();

    if (date) {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
            startDate = parsedDate;
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(parsedDate);
            endDate.setHours(23, 59, 59, 999);
        } else {
            endDate.setHours(23, 59, 59, 999);
        }
    } else {
        endDate.setHours(23, 59, 59, 999);
    }

    const showtimes = await Showtime.find({
        cinema: id,
        startTime: {
            $gte: startDate,
            $lte: endDate
        }
    })
        .populate({
            path: "movie",
            select: "title duration format ageRating slug"
        })
        .populate({
            path: "room",
            select: "name totalRows seatsPerRow capacity"
        });

    return ok(res, {
        cinema,
        date,
        showtimes,
    })
});
export const createCinema = asyncHandler(async (req, res) => {
    const {
        name,
        isActive,
        phone,
        address,
        city,
        district,
        email,
        openingTime,
        closingTime,

    } = req.body;

    if (!name || !city || !address || !phone || !email || !openingTime || !closingTime) {
        return fail(res, 400, "vui lòng cung cấp đủ thông tin")
    }

    const cinema = await Cinema.create({
        name,
        isActive,
        phone,
        address,
        city,
        district,
        email,
        openingTime,
        closingTime,
    });

    return created(res, cinema);
});

export const updateCinema = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, isActive, phone, address, city, district, email, openingTime, closingTime } = req.body;
    const cinema = await Cinema.findById(id);
    if (!cinema) {
        return fail(res, 404, "không tìm thấy rạp");
    }
    cinema.name = name || cinema.name;
    cinema.isActive = isActive !== undefined ? isActive : cinema.isActive;
    cinema.phone = phone || cinema.phone;
    cinema.address = address || cinema.address;
    cinema.city = city || cinema.city;
    cinema.district = district || cinema.district;
    cinema.email = email || cinema.email;
    cinema.openingTime = openingTime || cinema.openingTime;
    cinema.closingTime = closingTime || cinema.closingTime;
    await cinema.save();
    return ok(res, cinema, "cập nhật rạp thành công");
});
export const deleteCinema = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cinema = await Cinema.findByIdAndDelete(id);
    if (!cinema) {
        return fail(res, 404, "không tìm thấy rạp");
    }
    return ok(res, cinema, "xóa rạp thành công");
});
export const addRoom = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        name,
        totalRows,
        seatsPerRow,
        capacity,
        roomType,
    } = req.body;

    if (!name || !totalRows || !seatsPerRow || !capacity) {
        return fail(res, 400, "vui lòng cung cấp đủ thông tin")
    }

    const cinema = await Cinema.findById(id);
    if (!cinema) {
        return fail(res, 404, "không tìm thấy rạp");
    }
    const room = await Room.create({
        cinema: id,
        name,
        roomType,
        totalRows,
        seatsPerRow,
        capacity,
    });
    return created(res, room);
});
export const getCinemaStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cinema = await Cinema.findById(id);
    if (!cinema) {
        return fail(res, 404, "không tìm thấy rạp");
    }
    const showtimeIds = await Showtime.find({ cinema: id }).distinct('_id');
    const totalRooms = await Room.countDocuments({ cinema: id });
    const totalBookings = await Booking.countDocuments({ showtime: { $in: showtimeIds } });

    const stats = {
        totalRooms,
        totalShowtimes: showtimeIds.length,
        totalBookings
    };
    return ok(res, stats);
});





``