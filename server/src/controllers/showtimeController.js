import Showtime from "../models/Showtime.js";
import Movie from "../models/Movie.js";
import Room from "../models/Room.js";
import BookingSeat from "../models/BookingSeat.js";
import Booking from "../models/Booking.js";
import PricingRule from "../models/PricingRule.js";
import { asyncHandler } from "../utils/asynHandler.js";

const calculateDynamicPrice = async (basePrice, startTime) => {
  const pricingRules = await PricingRule.find({ isActive: true });
  let maxSurchargePercentage = 0;

  const showtimeDate = new Date(startTime);
  const showtimeDay = showtimeDate.getDay();
  const showtimeHour = showtimeDate.getHours();
  const showtimeMinute = showtimeDate.getMinutes();

  pricingRules.forEach((rule) => {
    let applied = false;
    if (rule.ruleType === "weekend") {
      if (showtimeDay === 0 || showtimeDay === 6) {
        applied = true;
      }
    } else if (rule.ruleType === "holiday") {
      if (rule.endDate) {
        const startOfDay = new Date(rule.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(rule.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (showtimeDate >= startOfDay && showtimeDate <= endOfDay) {
          applied = true;
        }
      } else if (
        rule.date &&
        rule.date.getDate() === showtimeDate.getDate() &&
        rule.date.getMonth() === showtimeDate.getMonth() &&
        rule.date.getFullYear() === showtimeDate.getFullYear()
      ) {
        applied = true;
      }
    } else if (rule.ruleType === "peak_hour") {
      if (rule.startTime && rule.endTime) {
        const [startH, startM] = rule.startTime.split(":").map(Number);
        const [endH, endM] = rule.endTime.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const showtimeMinutes = showtimeHour * 60 + showtimeMinute;
        if (showtimeMinutes >= startMinutes && showtimeMinutes <= endMinutes) {
          applied = true;
        }
      }
    }

    if (applied) {
      maxSurchargePercentage = Math.max(maxSurchargePercentage, rule.surchargePercentage);
    }
  });

  return basePrice * (1 + maxSurchargePercentage / 100);
};

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
  const { movie, date, includePast } = req.query;
  const query = {};

  if (movie) {
    query.movie = movie;
  }

  if (date) {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {

      const [year, month, day] = date.split("-").map(Number);
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0 - 7, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 23 - 7, 59, 59, 999));
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
    .populate("room")
    .sort({ startTime: 1 });

  return ok(res, showtimes);
});

export const getShowtimeById = asyncHandler(async (req, res) => {
  const showtime = await Showtime.findById(req.params.id)
    .populate("movie")
    .populate("room");

  if (!showtime) {
    return fail(res, 404, "Không tìm thấy suất chiếu");
  }

  return ok(res, showtime);
});

export const createShowtime = asyncHandler(async (req, res) => {
  const {
    movie,
    room,
    startTime,
    endTime,
    format,
    language,
    subtitle,
    basePrice,
  } = req.body;

  const movieExists = await Movie.findById(movie);
  const roomExists = await Room.findById(room);

  if (!movieExists) return fail(res, 404, "Không tìm thấy phim");
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

  const finalPrice = await calculateDynamicPrice(basePrice, start);

  const showtime = await Showtime.create({
    movie,
    room,
    startTime: start,
    endTime: end,
    format,
    language,
    subtitle,
    basePrice: finalPrice,
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

  const now = new Date();
  if (new Date(showtimeExists.startTime) <= now) {
    return fail(res, 400, "Không thể xóa lịch chiếu đang hoặc đã diễn ra.");
  }

  const hasBooked = await Booking.exists({
    showtime: id,
    status: { $in: ["pending", "confirmed", "completed"] }
  });

  if (hasBooked) {
    return fail(res, 400, "Không thể xóa lịch chiếu đã có vé đặt.");
  }

  const showtime = await Showtime.findByIdAndDelete(id);
  return ok(res, showtime, "Xóa suất chiếu thành công");
});

export const massDeleteShowtimes = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return fail(res, 400, "Vui lòng chọn ít nhất 1 suất chiếu để xóa.");
  }

  const now = new Date();

  // Lấy thông tin các suất chiếu
  const showtimes = await Showtime.find({ _id: { $in: ids } });

  if (showtimes.length !== ids.length) {
    return fail(res, 404, "Một số suất chiếu không tồn tại.");
  }

  // Kiểm tra điều kiện từng suất chiếu
  for (const st of showtimes) {
    if (new Date(st.startTime) <= now) {
      return fail(res, 400, `Không thể xóa suất chiếu lúc ${new Date(st.startTime).toLocaleString('vi-VN')} vì đang hoặc đã diễn ra.`);
    }

    const hasBooked = await Booking.exists({
      showtime: st._id,
      status: { $in: ["pending", "confirmed", "completed"] }
    });

    if (hasBooked) {
      return fail(res, 400, `Không thể xóa suất chiếu lúc ${new Date(st.startTime).toLocaleString('vi-VN')} vì đã có vé đặt.`);
    }
  }

  // Nếu tất cả hợp lệ -> Xóa
  await Showtime.deleteMany({ _id: { $in: ids } });
  return ok(res, null, `Đã xóa thành công ${ids.length} suất chiếu.`);
});

export const updateShowtime = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const showtimeExists = await Showtime.findById(id);
  if (!showtimeExists) {
    return fail(res, 404, "Không tìm thấy suất chiếu");
  }

  const hasBooked = await Booking.exists({
    showtime: id,
    status: { $in: ["pending", "confirmed", "completed"] }
  });

  if (hasBooked) {
    return fail(res, 400, "Không thể chỉnh sửa lịch chiếu đã có vé đặt.");
  }

  const { movie, room, startTime, endTime, status } = req.body;

  if (movie) {
    const movieExists = await Movie.findById(movie);
    if (!movieExists) return fail(res, 404, "Không tìm thấy phim");
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

  const reqBody = { ...req.body };

  const showtime = await Showtime.findByIdAndUpdate(
    id,
    reqBody,
    { new: true }
  );

  return ok(res, showtime, "Cập nhật suất chiếu thành công");
});
