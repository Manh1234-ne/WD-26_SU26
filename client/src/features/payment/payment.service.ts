import { api } from "../../services/api"
import type { ApiResponse } from "../booking/booking.types"
import type { Payment } from "./payment.types"

export type CreatePaymentData = {
    paymentUrl?: string
    payUrl?: string
    payment: Payment
}

export type VerifyPaymentData = {
    message: string
    payment: Payment
    booking: any
}

export const createVnPayUrl = async (bookingId: string) => {
    const response = await api.post<ApiResponse<CreatePaymentData>>('/payments/create-vnpay-url', { bookingId })
    return response.data
}

export const createMockMomoPayment = async (bookingId: string) => {
    const response = await api.post<ApiResponse<CreatePaymentData>>('/mock-momo/create', { bookingId })
    return response.data
}

export const verifyVnPayReturn = async (params: Record<string, any>) => {
    const response = await api.get<ApiResponse<VerifyPaymentData>>('/payments/vnpay-return', { params })
    return response.data
}

export const getPaymentByBooking = async (bookingId: string) => {
    const response = await api.get<ApiResponse<Payment>>(`/payments/booking/${bookingId}`)
    return response.data
}
