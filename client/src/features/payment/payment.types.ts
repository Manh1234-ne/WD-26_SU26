import type { Booking } from "../booking/booking.types"

export type Payment = {
    _id: string
    booking: string | Booking
    user: string
    amount: number
    method: 'cash' | 'card' | 'momo' | 'vnpay' | 'zalopay' | 'bank_transfer'
    status: 'pending' | 'paid' | 'failed' | 'refunded'
    transactionId?: string
    paidAt?: string
    refundedAt?: string
    note?: string
    createdAt: string
    updatedAt: string
}

export type CreatePaymentResponse = {
    success: boolean
    data: {
        paymentUrl?: string // VNPay
        payUrl?: string // MoMo
        payment: Payment
    }
    message?: string
}

export type VerifyPaymentResponse = {
    success: boolean
    data: {
        message: string
        payment: Payment
        booking: Booking
    }
    message?: string
}
