import { api } from "../../services/api";
import type {
  ApiResponse,
  Booking,
  BookingWithSeats,
  CreateBookingPayload,
  UpdateBookingSeatsPayload,
} from "./booking.types";

export const createBooking = async (booking: CreateBookingPayload) => {
  const response = await api.post<ApiResponse<Booking>>(
    "/bookings",
    booking
  );
  return response.data;
};

export const getBookingById = async (id: string) => {
  const response = await api.get<ApiResponse<BookingWithSeats>>(
    `/bookings/${id}`
  );
  return response.data;
};

export const getBookingsByUser = async (userId: string) => {
  const response = await api.get<ApiResponse<Booking[]>>(
    `/bookings/user/${userId}`
  );
  return response.data;
};

export const completeBooking = async (id: string) => {
  const response = await api.patch<ApiResponse<Booking>>(
    `/bookings/${id}/complete`
  );
  return response.data;
};

export const markBookingPrinted = async (id: string) => {
  const response = await api.patch<ApiResponse<Booking>>(
    `/bookings/${id}/print`
  );
  return response.data;
};

export const cancelBooking = async (id: string) => {
  const response = await api.patch<ApiResponse<Booking>>(
    `/bookings/${id}/cancel`
  );
  return response.data;
};

export const updateBookingSeats = async (
  bookingId: string,
  seatIds: string[]
) => {
  const payload: UpdateBookingSeatsPayload = { seatIds };
  const response = await api.patch<ApiResponse<Booking>>(
    `/bookings/${bookingId}/seats`,
    payload
  );

  return response.data;
};

export const incrementPrintCount = async (id: string) => {
  const response = await api.patch<ApiResponse<Booking>>(
    `/bookings/${id}/print`
  );
  return response.data;
};

export const cancelActiveHoldingSessions = async (exceptBookingId?: string | null) => {
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith("cinema_holding_")) {
      keys.push(k);
    }
  }

  for (const key of keys) {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { bookingId?: string };
        if (parsed?.bookingId && parsed.bookingId !== exceptBookingId) {
          await cancelBooking(parsed.bookingId).catch(() => {});
        }
      } catch {
        // ignore
      }
    }
    if (!exceptBookingId || !raw?.includes(exceptBookingId)) {
      sessionStorage.removeItem(key);
    }
  }
};

export const cancelOtherHoldingSessions = async (currentShowtimeId: string) => {
  const targetKey = `cinema_holding_${currentShowtimeId}`;
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith("cinema_holding_") && k !== targetKey) {
      keys.push(k);
    }
  }

  for (const key of keys) {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { bookingId?: string };
        if (parsed?.bookingId) {
          await cancelBooking(parsed.bookingId).catch(() => {});
        }
      } catch {
        // ignore
      }
    }
    sessionStorage.removeItem(key);
  }
};
