import { api } from "../../services/api"
import type { ApiResponse, Showtime } from "./showtime.type"

export type ShowtimeFilters = {
    movie?: string
    cinema?: string
    date?: string
    includePast?: boolean
}

export const getAllShowtimes = async (filters?: ShowtimeFilters) => {
    const response = await api.get<ApiResponse<Showtime[]>>("/showtimes", {
        params: filters
    })
    return response.data.data
}

export const getShowtimeById = async (id: string) => {
    const response = await api.get<ApiResponse<Showtime>>(`/showtimes/${id}`)
    return response.data.data
}

export const createShowtime = async (payload: Omit<Showtime, '_id' | 'createdAt' | 'updatedAt' | 'movie' | 'cinema' | 'room'> & { movie: string; cinema: string; room: string }) => {
    const response = await api.post<ApiResponse<Showtime>>('/showtimes', payload)
    return response.data.data
}

export const updateShowtime = async (id: string, payload: Partial<Omit<Showtime, '_id' | 'createdAt' | 'updatedAt' | 'movie' | 'cinema' | 'room'> & { movie?: string; cinema?: string; room?: string }>) => {
    const response = await api.put<ApiResponse<Showtime>>(`/showtimes/${id}`, payload)
    return response.data.data
}

export const deleteShowtime = async (id: string) => {
    const response = await api.delete<ApiResponse<Showtime>>(`/showtimes/${id}`)
    return response.data.data
}