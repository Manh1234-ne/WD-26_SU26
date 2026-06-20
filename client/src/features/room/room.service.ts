import { api } from '../../services/api'
import type { ApiResponse, Room, RoomPayload } from './room.types'

type RoomQuery = {
  cinema?: string
  roomType?: string
  isActive?: boolean
}

export async function getRooms(query: RoomQuery = {}) {
  const params = {
    ...(query.cinema ? { cinema: query.cinema } : {}),
    ...(query.roomType ? { roomType: query.roomType } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
  }

  const response = await api.get<ApiResponse<Room[]>>('/rooms', { params })
  return response.data.data
}

export async function getRoomById(id: string) {
  const response = await api.get<ApiResponse<Room>>(`/rooms/${id}`)
  return response.data.data
}

export async function createRoom(payload: RoomPayload) {
  const response = await api.post<ApiResponse<Room>>('/rooms', payload)
  return response.data.data
}

export async function updateRoom(id: string, payload: Partial<RoomPayload>) {
  const response = await api.put<ApiResponse<Room>>(`/rooms/${id}`, payload)
  return response.data.data
}

export async function deleteRoom(id: string) {
  await api.delete(`/rooms/${id}`)
}
