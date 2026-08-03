import Showtime from "../models/Showtime.js";
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
  if (req.query.movie) match.movie = req.query.movie;
  if (req.query.cinema) match.cinema = req.query.cinema;

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
