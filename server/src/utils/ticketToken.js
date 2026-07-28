import jwt from "jsonwebtoken";

const getSecret = () => process.env.TICKET_QR_SECRET || "default_ticket_qr_secret";

export const generateTicketToken = (booking) => {
  return jwt.sign(
    {
      bookingId: booking._id || booking.id,
    },
    getSecret(),
    { expiresIn: "30d" }
  );
};

export const verifyTicketToken = (token) => {
  return jwt.verify(token, getSecret());
};