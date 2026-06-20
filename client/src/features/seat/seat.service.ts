import { api } from '../../services/api'
import type { ApiResponse, Seat, SeatPayload } from './seat.types'
import type { Room } from '../room/room.types'

type SeatQuery = {
  room?: string
  type?: string
  isActive?: boolean
}

export async function getSeats(query: SeatQuery = {}) {
  const params = {
    ...(query.room ? { room: query.room } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
  }

  const response = await api.get<ApiResponse<Seat[]>>('/seats', { params })
  return response.data.data
}

export async function getSeatById(id: string) {
  const response = await api.get<ApiResponse<Seat>>(`/seats/${id}`)
  return response.data.data
}

export async function getSeatsByRoom(roomId: string) {
  const response = await api.get<ApiResponse<{ room: Room; seats: Seat[] }>>(`/seats/room/${roomId}`)
  return response.data.data
}

export async function createSeat(payload: SeatPayload) {
  const response = await api.post<ApiResponse<Seat>>('/seats', payload)
  return response.data.data
}

export async function updateSeat(id: string, payload: Partial<SeatPayload>) {
  const response = await api.put<ApiResponse<Seat>>(`/seats/${id}`, payload)
  return response.data.data
}

export async function deleteSeat(id: string) {
  await api.delete(`/seats/${id}`)
}

export async function generateSeats(roomId: string) {
  const response = await api.post<ApiResponse<Seat[]>>(`/seats/generate/${roomId}`)
  return response.data.data
}
