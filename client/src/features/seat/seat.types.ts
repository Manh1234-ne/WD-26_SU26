export type SeatType = 'standard' | 'vip' | 'couple' | 'disabled'

export type Seat = {
  _id: string
  room: {
    _id: string
    name: string
    roomType: string
    totalRows: number
    seatsPerRow: number
    capacity: number
  }
  row: string
  number: number
  code: string
  type: SeatType
  priceMultiplier: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export type SeatPayload = {
  room: string
  row: string
  number: number
  code: string
  type: SeatType
  priceMultiplier: number
  isActive?: boolean
}

export type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}
