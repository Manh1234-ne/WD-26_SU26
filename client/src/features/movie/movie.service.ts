
import { api } from '../../services/api'
import type { ApiResponse, Movie, MoviePayload, MovieStatus } from './movie.types'

type MovieQuery = {
  status?: MovieStatus | 'all'
  search?: string
  isActive?: string
  limit?: string
}

export async function getMovies(query: MovieQuery = {}) {
  const params = {
    ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(query.isActive ? { isActive: query.isActive } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
  }

  const response = await api.get<ApiResponse<Movie[]>>('/movies', { params })
  return response.data.data
}

export async function getMovieById(id: string) {
  const response = await api.get<ApiResponse<Movie>>(`/movies/${id}`)
  return response.data.data
}

export async function createMovie(payload: MoviePayload) {
  const response = await api.post<ApiResponse<Movie>>('/movies', payload)
  return response.data.data
}

export async function updateMovie(id: string, payload: MoviePayload) {
  const response = await api.put<ApiResponse<Movie>>(`/movies/${id}`, payload)
  return response.data.data
}

export async function deleteMovie(id: string) {
  await api.delete(`/movies/${id}`)
}
