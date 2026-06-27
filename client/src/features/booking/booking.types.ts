export type Booking = {
    _id: string,
    bookingCode: string,
    user: {
        _id: string,

        fullName: string,
        email: string,
        phone: string,
    },
    showtime: {
        _id: string,
        movie: {
            _id: string,
            title: string,
            posterUrl: string
        },
        screen: {
            _id: string,
            name: string,
        },
        room: {
            _id: string,
            name: string,
        },
        startTime: string,
        endTime: string,
    },
    voucher: {
        code: string,
        discount: number
    } | null,
    totalSeatPrice: number,
    discountAmount: number,
    finalAmount: number,
    status: string,
    createdAt: string,
    updatedAt: string,
}

export type User = {
    _id: string,
    name: string,
    email: string,
    phone: string,
}


export type ApiResponse<T> = {
    success: boolean
    data: T
    message?: string
}
