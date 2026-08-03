import Showtime from "../models/Showtime.js";
import Booking from "../models/Booking.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynHandler.js";

const TIMEZONE = "Asia/Bangkok";

const parseDateRange = (query) => {
  const match = { status: { $ne: "cancelled" } };
  if (query.startDate || query.endDate) {
    match.startTime = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      if (!Number.isNaN(start.getTime())) match.startTime.$gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (!Number.isNaN(end.getTime())) match.startTime.$lte = end;
    }
    if (Object.keys(match.startTime).length === 0) delete match.startTime;
  }
  return match;
};

export const getShowtimeStatistics = asyncHandler(async (req, res) => {
  const match = parseDateRange(req.query);
  if (mongoose.Types.ObjectId.isValid(req.query.movie)) match.movie = new mongoose.Types.ObjectId(req.query.movie);
  if (mongoose.Types.ObjectId.isValid(req.query.cinema)) match.cinema = new mongoose.Types.ObjectId(req.query.cinema);

  const baseMatch = { $match: match };
  const [peakHours, peakRooms, peakDates, peakWeekdays] = await Promise.all([
    Showtime.aggregate([
      baseMatch,
      { $group: { _id: { $hour: { date: "$startTime", timezone: TIMEZONE } }, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 5 },
      { $project: { _id: 0, hour: "$_id", count: 1 } },
    ]),
    Showtime.aggregate([
      baseMatch,
      { $group: { _id: "$room", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 5 },
      { $lookup: { from: "rooms", localField: "_id", foreignField: "_id", as: "room" } },
      { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, roomId: "$_id", roomName: { $ifNull: ["$room.name", "Phòng không xác định"] }, count: 1 } },
    ]),
    Showtime.aggregate([
      baseMatch,
      { $group: { _id: { $dateToString: { date: "$startTime", format: "%Y-%m-%d", timezone: TIMEZONE } }, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 5 },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ]),
    Showtime.aggregate([
      baseMatch,
      { $group: { _id: { $dayOfWeek: { date: "$startTime", timezone: TIMEZONE } }, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, dayOfWeek: "$_id", count: 1 } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: { peakHours, peakRooms, peakDates, peakWeekdays },
  });
});

export const getMovieRankings = asyncHandler(async (req, res) => {
  const showtimeMatch = {};
  if (req.query.startDate) {
    const start = new Date(req.query.startDate);
    if (!Number.isNaN(start.getTime())) showtimeMatch["showtime.startTime"] = { $gte: start };
  }
  if (req.query.endDate) {
    const end = new Date(req.query.endDate);
    if (!Number.isNaN(end.getTime())) {
      showtimeMatch["showtime.startTime"] = { ...(showtimeMatch["showtime.startTime"] || {}), $lte: end };
    }
  }
  if (mongoose.Types.ObjectId.isValid(req.query.movie)) {
    showtimeMatch["showtime.movie"] = new mongoose.Types.ObjectId(req.query.movie);
  }

  const [result] = await Booking.aggregate([
    { $match: { status: { $in: ["confirmed", "completed"] } } },
    { $lookup: { from: "showtimes", localField: "showtime", foreignField: "_id", as: "showtime" } },
    { $unwind: "$showtime" },
    ...(Object.keys(showtimeMatch).length ? [{ $match: showtimeMatch }] : []),
    { $lookup: { from: "bookingseats", localField: "_id", foreignField: "booking", as: "seats" } },
    {
      $set: {
        ticketCount: {
          $size: {
            $filter: { input: "$seats", as: "seat", cond: { $eq: ["$$seat.status", "booked"] } },
          },
        },
      },
    },
    {
      $group: {
        _id: "$showtime.movie",
        revenue: { $sum: "$finalAmount" },
        tickets: { $sum: "$ticketCount" },
        bookings: { $sum: 1 },
      },
    },
    { $lookup: { from: "movies", localField: "_id", foreignField: "_id", as: "movie" } },
    { $unwind: { path: "$movie", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        movieId: "$_id",
        title: { $ifNull: ["$movie.title", "Phim không xác định"] },
        revenue: 1,
        tickets: 1,
        bookings: 1,
      },
    },
    {
      $facet: {
        topRevenue: [{ $sort: { revenue: -1, title: 1 } }, { $limit: 5 }],
        hotMovies: [{ $sort: { tickets: -1, revenue: -1, title: 1 } }, { $limit: 5 }],
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: result || { topRevenue: [], hotMovies: [] },
  });
});
