export type TicketBooking = {
  id: string;
  bookingCode: string;
  movieTitle: string;
  roomName: string;
  showtime: string;
  seats: string;
  customerName: string;
  customerEmail: string;
  checkedInAt: string;
};

export type VerifyTicketResponse = {
  ok: boolean;
  message?: string;
  booking?: TicketBooking;
  checkedInAt?: string;
};
