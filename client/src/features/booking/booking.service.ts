import { api } from "../../services/api"
import type { ApiResponse, Booking } from "./booking.types"

export const createBooking = async (booking: Booking) => {
    const response = await api.post<ApiResponse<Booking>>('/booking', booking)
    return response.data
}

export const getBookingById = async (id: string) => {
    const response = await api.get<ApiResponse<Booking>>(`/booking/${id}`)
    return response.data
}

export const getBookingsByUser = async (userId: string) => {
    const response = await api.get<ApiResponse<Booking[]>>(`/booking/user/${userId}`)
    return response.data
}

export const completeBooking = async (id: string) => {
    const response = await api.put<ApiResponse<Booking>>(`/booking/${id}/complete`);
    return response.data
}

export const cancelBooking = async (id: string) => {
    const response = await api.put<ApiResponse<Booking>>(`/booking/${id}/cancel`);
    return response.data
}