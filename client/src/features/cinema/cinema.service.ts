import { api } from '../../services/api'
import type { ApiResponse, Cinema, CinemaPayload, CinemaListResponse } from './cinema.types'

type CinemaQuery = {
  city?: string
  isActive?: boolean
  page?: number
  limit?: number
}

export async function getCinemas(query: CinemaQuery = {}) {
  const params = {
    ...(query.city ? { city: query.city } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.page ? { page: query.page } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
  }

  const response = await api.get<ApiResponse<CinemaListResponse>>('/cinemas', { params })
  return response.data.data
}

export async function getCinemaById(id: string) {
  const response = await api.get<ApiResponse<Cinema>>(`/cinemas/${id}`)
  return response.data.data
}

export async function createCinema(payload: CinemaPayload) {
  const response = await api.post<ApiResponse<Cinema>>('/cinemas', payload)
  return response.data.data
}

export async function updateCinema(id: string, payload: CinemaPayload) {
  const response = await api.put<ApiResponse<Cinema>>(`/cinemas/${id}`, payload)
  return response.data.data
}

export async function deleteCinema(id: string) {
  await api.delete(`/cinemas/${id}`)
}

export async function getCinemaCities() {
  const response = await api.get<ApiResponse<string[]>>('/cinemas/cities')
  return response.data.data
}
