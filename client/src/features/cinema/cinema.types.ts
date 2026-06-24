export type Cinema = {
  _id: string
  name: string
  address: string
  city: string
  district?: string
  phone: string
  email: string
  openingTime: string
  closingTime: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type CinemaPayload = Omit<Cinema, '_id' | 'createdAt' | 'updatedAt'>

export type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

export type CinemaListResponse = {
  cinemas: Cinema[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
