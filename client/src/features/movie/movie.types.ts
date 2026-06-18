export type MovieStatus = 'coming_soon' | 'now_showing' | 'ended'

export type Movie = {
  _id: string
  title: string
  originalTitle?: string
  description: string
  genres: string[]
  duration: number
  releaseDate: string
  ageRating: 'P' | 'K' | 'T13' | 'T16' | 'T18' | 'C'
  language?: string
  director?: string
  cast?: string[]
  posterUrl?: string
  backdropUrl?: string
  trailerUrl?: string
  status: MovieStatus
  endDate: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type MoviePayload = Omit<Movie, '_id' | 'createdAt' | 'updatedAt'> & {
  genres: string[]
  cast: string[]
}

export type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}
