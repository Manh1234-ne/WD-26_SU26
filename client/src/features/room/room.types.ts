export type Room = {
  _id: string
  cinema: {
    _id: string
    name: string
    city?: string
    district?: string
  }
  name: string
  roomType: '2D' | '3D' | 'IMAX' | 'VIP'
  totalRows: number
  seatsPerRow: number
  capacity: number
  isActive: boolean
  aisleColumns?: number[]
  aisleRows?: string[]
  createdAt?: string
  updatedAt?: string
}

export type RoomPayload = {
  cinema: string
  name: string
  roomType: '2D' | '3D' | 'IMAX' | 'VIP'
  totalRows: number
  seatsPerRow: number
  capacity: number
  isActive?: boolean
  aisleColumns?: number[]
  aisleRows?: string[]
}

export type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}
