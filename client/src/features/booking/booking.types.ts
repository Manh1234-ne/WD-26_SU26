export type User = {
    _id: string,
    fullName: string,
    email: string,
    phone: string,
}

export type Booking = {
    _id: string,
    bookingCode: string,
    user: User,
    showtime: {
        _id: string,
        movie: {
            _id: string,
            title: string,
            posterUrl: string
        },
        cinema?: {
            _id: string,
            name: string,
        },
        screen?: {
            _id: string,
            name: string,
        },
        room: {
            _id: string,
            name: string,
        },
        startTime: string,
        endTime: string,
        basePrice: number,
    },
    voucher: {
        _id?: string,
        code: string,
        discount: number
    } | null,
    totalSeatPrice: number,
    totalComboPrice?: number,
    discountAmount: number,
    finalAmount: number,
    status: string,
    expiresAt?: string | null,
    cancelledAt?: string | null,
    createdAt: string,
    updatedAt: string,
}

export type CreateBookingPayload = {
    user?: string;
    showtime?: string;
    seatIds: string[];
    voucherCode?: string;
    comboIds?: string[];
    customExpiresAt?: string | Date;
}

export type Seat = {
    _id: string
    row: string
    col: number
    label: string
    type: string
    price: number
}

export type Combo = {
    _id: string
    name: string
    price: number
    image?: string
    description?: string
}

export type BookingComboItem = {
    _id: string
    combo: Combo
    quantity: number
    unitPrice: number
    totalPrice: number
}

export type BookingDetail = {
    booking: Booking
    seats: Seat[]
    combos: BookingComboItem[]
}

export type BookingWithSeats = BookingDetail

export type UpdateBookingSeatsPayload = {
    seatIds: string[]
}

export type ApiResponse<T> = {
    success: boolean
    data: T
    message?: string
}
