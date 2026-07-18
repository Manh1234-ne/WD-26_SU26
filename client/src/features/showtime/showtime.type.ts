export type Showtime = {
    _id: string,
    movie: {
        _id: string,
        title: string,
        imageUrl: string,
    },
    cinema?: {
        _id: string,
        name: string,
    },
    room: {
        _id: string,
        name: string,
    },
    startTime: Date,
    endTime: Date,
    format: string,
    language: string,
    subtitle: string,
    basePrice: number,
    status: boolean,
    createdAt: string,
    updatedAt: string,
}

export type ApiResponse<T> = {
    success: boolean
    data: T
    message?: string
}

