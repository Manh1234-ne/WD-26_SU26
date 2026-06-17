import Showtime from "../models/Showtime.js";
import Movie from "../models/Movie.js";
import Cinema from "../models/Cinema.js";
import Room from "../models/Room.js";
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

export const getAllShowtimes = asyncHandler(async (req, res) => {
  const showtimes = await Showtime.find()
    .populate("movie")
    .populate("cinema")
    .populate("room");

  return ok(res, showtimes);
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

  const showtime = await Showtime.create({
    movie,
    cinema,
    room,
    startTime,
    endTime,
    format,
    language,
    subtitle,
    basePrice,
    status: "open",
  });

  return created(res, showtime);
});