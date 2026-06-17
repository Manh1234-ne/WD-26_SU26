import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import Showtime from "../models/Showtime.js";
import Seat from "../models/Seat.js";

export const createBookingService = async ({
  user,
  showtime,
  seatIds,
}) => {
  const showtimeExists = await Showtime.findById(showtime);

  if (!showtimeExists) {
    throw new Error("Không tìm thấy suất chiếu");
  }

  const seats = await Seat.find({
    _id: { $in: seatIds },
    room: showtimeExists.room,
    isActive: true,
  });

  if (seats.length !== seatIds.length) {
    throw new Error("Ghế không hợp lệ");
  }

  const bookedSeats = await BookingSeat.find({
    showtime,
    seat: { $in: seatIds },
    status: { $in: ["held", "booked"] },
  });

  if (bookedSeats.length > 0) {
    throw new Error("Ghế đã được đặt");
  }

  const totalSeatPrice = seats.reduce(
    (sum, seat) =>
      sum + showtimeExists.basePrice * seat.priceMultiplier,
    0
  );

  const booking = await Booking.create({
    bookingCode: `BK${Date.now()}`,
    user,
    showtime,
    totalSeatPrice,
    finalAmount: totalSeatPrice,
    status: "pending",
  });

  const bookingSeats = seats.map((seat) => ({
    booking: booking._id,
    showtime,
    seat: seat._id,
    seatCode: seat.code,
    seatType: seat.type,
    price:
      showtimeExists.basePrice * seat.priceMultiplier,
    status: "held",
  }));

  await BookingSeat.insertMany(bookingSeats);

  return booking;
};