export type Showtime = {
    _id: string,
    movie: {
        _id: string,
        title: string,
        imageUrl: string,
    },
    cinema: {
        _id: string,
        name: string,
    },
    room: {
        _id: string,
        name: string,
    },
    startTime: string,
    endTime: string,
    format: string,
    language: string,
    subtitle: string,
    basePrice: number,
    status: string,
    createdAt: string,
    updatedAt: string,
}

export type ApiResponse<T> = {
    success: boolean
    data: T
    message?: string
}
