import Showtime from "../models/Showtime.js";
import Movie from "../models/Movie.js";
import Cinema from "../models/Cinema.js";
import Room from "../models/Room.js";
import { asyncHandler } from "../utils/asynHandler.js";

const ok = (res, data, message) =>
  res.status(200).json({
    success: true,
    message,
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

export const getAllShowtimes = asyncHandler(async (req, res) => {
  const { movie, cinema, date, includePast } = req.query;
  const query = {};

  if (movie) {
    query.movie = movie;
  }
  if (cinema) {
    query.cinema = cinema;
  }


  if (date) {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      const startOfDay = new Date(parsedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }
  }

  if (includePast !== "true") {
    const threshold = new Date(Date.now() - 15 * 60 * 1000);
    if (query.startTime) {
      if (query.startTime.$gte < threshold) {
        query.startTime.$gte = threshold;
      }
    } else {
      query.startTime = { $gte: threshold };
    }
  }

  const showtimes = await Showtime.find(query)
    .populate("movie")
    .populate("cinema")
    .populate("room")
    .sort({ startTime: 1 });

  return ok(res, showtimes);
});

export const getShowtimeById = asyncHandler(async (req, res) => {
  const showtime = await Showtime.findById(req.params.id)
    .populate("movie")
    .populate("cinema")
    .populate("room");

  if (!showtime) {
    return fail(res, 404, "Không tìm thấy suất chiếu");
  }

  return ok(res, showtime);
});

export const createShowtime = asyncHandler(async (req, res) => {
  const {
    movie,
    cinema,
    room,
    startTime,
    endTime,
    format,
    language,
    subtitle,
    basePrice,
  } = req.body;

  const movieExists = await Movie.findById(movie);
  const cinemaExists = await Cinema.findById(cinema);
  const roomExists = await Room.findById(room);

  if (!movieExists) return fail(res, 404, "Không tìm thấy phim");
  if (!cinemaExists) return fail(res, 404, "Không tìm thấy rạp");
  if (!roomExists) return fail(res, 404, "Không tìm thấy phòng");

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return fail(res, 400, "Thời gian bắt đầu hoặc kết thúc không hợp lệ");
  }
  if (start >= end) {
    return fail(res, 400, "Thời gian bắt đầu phải trước thời gian kết thúc");
  }

  const overlapping = await Showtime.findOne({
    room,
    status: { $ne: "cancelled" },
    $or: [
      {
        startTime: { $lt: end },
        endTime: { $gt: start },
      },
    ],
  });

  if (overlapping) {
    return fail(res, 400, "Phòng chiếu đã có lịch chiếu khác trong khoảng thời gian này");
  }

  const showtime = await Showtime.create({
    movie,
    cinema,
    room,
    startTime: start,
    endTime: end,
    format,
    language,
    subtitle,
    basePrice,
    status: "open",
  });

  return created(res, showtime);
});

export const deleteShowtime = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const showtimeExists = await Showtime.findById(id);
  if (!showtimeExists) {
    return fail(res, 404, "Không tìm thấy suất chiếu");
  }
  const showtime = await Showtime.findByIdAndDelete(id);
  return ok(res, showtime, "Xóa suất chiếu thành công");
});

export const updateShowtime = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const showtimeExists = await Showtime.findById(id);
  if (!showtimeExists) {
    return fail(res, 404, "Không tìm thấy suất chiếu");
  }

  const { movie, cinema, room, startTime, endTime } = req.body;

  if (movie) {
    const movieExists = await Movie.findById(movie);
    if (!movieExists) return fail(res, 404, "Không tìm thấy phim");
  }
  if (cinema) {
    const cinemaExists = await Cinema.findById(cinema);
    if (!cinemaExists) return fail(res, 404, "Không tìm thấy rạp");
  }
  if (room) {
    const roomExists = await Room.findById(room);
    if (!roomExists) return fail(res, 404, "Không tìm thấy phòng");
  }
  const newRoom = room || showtimeExists.room;
  const newStart = startTime ? new Date(startTime) : showtimeExists.startTime;
  const newEnd = endTime ? new Date(endTime) : showtimeExists.endTime;

  if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
    return fail(res, 400, "Thời gian bắt đầu hoặc kết thúc không hợp lệ");
  }
  if (newStart >= newEnd) {
    return fail(res, 400, "Thời gian bắt đầu phải trước thời gian kết thúc");
  }

  const overlapping = await Showtime.findOne({
    _id: { $ne: id },
    room: newRoom,
    status: { $ne: "cancelled" },
    $or: [
      {
        startTime: { $lt: newEnd },
        endTime: { $gt: newStart },
      },
    ],
  });

  if (overlapping) {
    return fail(res, 400, "Phòng chiếu đã có lịch chiếu khác trong khoảng thời gian này");
  }

  const showtime = await Showtime.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true }
  );

  return ok(res, showtime, "Cập nhật suất chiếu thành công");
});
