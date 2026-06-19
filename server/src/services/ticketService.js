export const buildTicketData = async (booking) => {
  const seats = await BookingSeat.find({ booking: booking._id });

  return {
    bookingCode: booking.bookingCode,
    seats,
    showtime: booking.showtime,
    user: booking.user,
  };
};